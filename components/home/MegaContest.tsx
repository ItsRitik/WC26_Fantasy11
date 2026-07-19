'use client'

/**
 * MegaContest - a single, promoted "grand final" room you share on social to
 * funnel users into one contest. Config-driven via public env vars:
 *
 *   NEXT_PUBLIC_MEGA_ROOM_ID   the room id to join (required to show the banner)
 *   NEXT_PUBLIC_MEGA_TITLE     headline (default: "World Cup Final Mega Contest")
 *   NEXT_PUBLIC_MEGA_PRIZE     prize text, e.g. "a cash prize" (optional)
 *
 * Match name / kickoff / spots are pulled live from the room itself.
 * Renders nothing until NEXT_PUBLIC_MEGA_ROOM_ID is set.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROOM_ID = process.env.NEXT_PUBLIC_MEGA_ROOM_ID
const TITLE   = process.env.NEXT_PUBLIC_MEGA_TITLE ?? 'World Cup Final Mega Contest'
const PRIZE   = process.env.NEXT_PUBLIC_MEGA_PRIZE

type RoomInfo = {
  max_players: number
  entries: number
}

// Premium "final night" background - deep navy/violet with a warm gold glow.
const BG = {
  backgroundColor: '#0d1024',
  backgroundImage:
    'radial-gradient(120% 130% at 12% -10%, rgba(250,204,21,0.20), transparent 42%),' +
    'radial-gradient(90% 120% at 100% 110%, rgba(99,102,241,0.22), transparent 45%),' +
    'linear-gradient(135deg, #0e1130 0%, #1b1140 55%, #0b1526 100%)',
}

export function MegaContest() {
  const [copied, setCopied] = useState(false)
  const [room, setRoom] = useState<RoomInfo | null>(null)

  useEffect(() => {
    if (!ROOM_ID) return
    const sb = createClient()
    ;(async () => {
      const [{ data: r }, { count }] = await Promise.all([
        sb.from('fantasy_rooms').select('max_players').eq('id', ROOM_ID).maybeSingle(),
        sb.from('fantasy_room_members').select('*', { count: 'exact', head: true }).eq('room_id', ROOM_ID),
      ])
      if (r) setRoom({ max_players: (r as { max_players: number }).max_players, entries: count ?? 0 })
    })().catch(() => {})
  }, [])

  if (!ROOM_ID) return null

  const href = `/fantasy/room/${ROOM_ID}`
  const share = () => {
    const url = `${window.location.origin}${href}`
    if (navigator.share) navigator.share({ title: TITLE, url }).catch(() => {})
    else { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-lg" style={BG}>
      <div className="pitch-sweep" />
      <div className="relative px-5 sm:px-8 py-6 sm:py-7">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 live-dot" />
          Grand Final Contest
        </div>

        <h2 className="mt-2.5 text-2xl sm:text-3xl font-black text-white leading-tight">{TITLE}</h2>

        <p className="mt-2 text-sm text-white/75 max-w-lg leading-relaxed">
          One room, one match: the World Cup Final. Draft your XI and climb the live leaderboard
          {PRIZE ? <> to win <span className="font-semibold text-white">{PRIZE}</span></> : null}.
          Spots are limited and fill first-come, so join early to claim yours.
        </p>

        {/* Spots filled */}
        {room && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3.5 py-2">
            <span className="text-[9px] uppercase tracking-wider text-white/50">Spots</span>
            <span className="text-sm font-bold text-white tabular-nums">{room.entries}/{room.max_players} joined</span>
          </div>
        )}

        <div className="mt-5 flex flex-nowrap items-center gap-2 sm:gap-3">
          <Link href={href}
            className="h-11 px-5 sm:px-6 flex items-center gap-1.5 rounded-xl bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-gray-100 transition-colors whitespace-nowrap shadow">
            Join the contest
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <button onClick={share}
            className="h-11 px-4 sm:px-5 flex items-center gap-1.5 rounded-xl bg-white/10 text-white text-xs sm:text-sm font-semibold border border-white/20 hover:bg-white/20 transition-colors whitespace-nowrap backdrop-blur-sm">
            {copied ? 'Link copied' : 'Share link'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
