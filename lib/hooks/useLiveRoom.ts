'use client'

/**
 * useLiveRoom - Supabase Realtime subscription for a fantasy room
 * ================================================================
 * FIX: channel + all .on() listeners must be chained BEFORE .subscribe().
 * Creating listeners inside an async callback causes the
 * "cannot add postgres_changes callbacks after subscribe()" error in
 * React StrictMode (effect runs twice → second run hits already-subscribed channel).
 *
 * Solution:
 *  1. Build the full channel pipeline synchronously at effect start
 *  2. Call .subscribe() immediately
 *  3. Fetch initial data separately (doesn't affect the channel)
 *  4. Use supabase.removeChannel() - not channel.unsubscribe() - for clean teardown
 *  5. Unique channel name per mount prevents stale-channel collisions
 */

import { useEffect, useState, useRef } from 'react'
import { createClient }                from '@/lib/supabase/client'
import type { FantasyRoom, FantasyLiveState } from '@/lib/supabase/types'

type UseLiveRoomResult = {
  room:      FantasyRoom | null
  liveState: FantasyLiveState | null
  loading:   boolean
  error:     string | null
}

let channelSeq = 0   // process-level counter → unique channel names across HMR reloads

export function useLiveRoom(roomId: string | null): UseLiveRoomResult {
  const [room,      setRoom]      = useState<FantasyRoom | null>(null)
  const [liveState, setLiveState] = useState<FantasyLiveState | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Keep a stable ref to the supabase client so removeChannel works even after re-renders
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!roomId) { setLoading(false); return }

    const supabase  = supabaseRef.current
    const channelId = `live-room-${roomId}-${++channelSeq}`

    // ── 1. Build channel with ALL listeners synchronously, then subscribe ──────
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'fantasy_live_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            setLiveState(payload.new as FantasyLiveState)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'fantasy_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            setRoom(prev => ({ ...prev, ...(payload.new as FantasyRoom) }))
          }
        },
      )
      .subscribe((status) => {
        // Realtime hiccups (CHANNEL_ERROR / TIMED_OUT) are transient and auto-
        // reconnect - they must NOT surface as a fatal "room not found", because
        // the room data is fetched separately below. Just log them.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[useLiveRoom] realtime status:', status, '- will auto-reconnect')
        }
      })

    // ── 2. Initial data fetch (independent of channel) ────────────────────────
    // Retry transient errors; only flag "not found" when the row is genuinely
    // missing. This prevents a network/auth blip on back-nav from showing the
    // "link expired" screen (which a refresh would otherwise fix).
    let cancelled = false
    ;(async () => {
      for (let attempt = 1; attempt <= 3 && !cancelled; attempt++) {
        const roomRes = await supabase.from('fantasy_rooms').select('*').eq('id', roomId).maybeSingle()
        if (cancelled) return

        if (roomRes.error) {
          if (attempt < 3) { await new Promise(r => setTimeout(r, 400 * attempt)); continue }
          setError(roomRes.error.message)
          setLoading(false)
          return
        }
        if (!roomRes.data) {
          if (attempt < 3) { await new Promise(r => setTimeout(r, 400 * attempt)); continue }
          setError('not_found')
          setLoading(false)
          return
        }

        setRoom(roomRes.data as FantasyRoom)
        const liveRes = await (supabase.from('fantasy_live_state') as any).select('*').eq('room_id', roomId).maybeSingle()
        if (!cancelled && liveRes?.data) setLiveState(liveRes.data as FantasyLiveState)
        setError(null)
        setLoading(false)
        return
      }
    })()

    // ── 3. Cleanup - removeChannel fully unregisters from Supabase ────────────
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [roomId])

  return { room, liveState, loading, error }
}
