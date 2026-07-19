'use client'

/**
 * MegaContest - a single, promoted "grand final" room you share on social to
 * funnel users into one contest. Config-driven via public env vars so you point
 * it at whatever room you create for the final (no code change to launch):
 *
 *   NEXT_PUBLIC_MEGA_ROOM_ID   the room id to join (required to show the banner)
 *   NEXT_PUBLIC_MEGA_TITLE     headline (default: "World Cup Final Mega Contest")
 *   NEXT_PUBLIC_MEGA_PRIZE     prize text, e.g. "a cash prize" (optional)
 *
 * Renders nothing until NEXT_PUBLIC_MEGA_ROOM_ID is set.
 */

import Link from 'next/link'
import { useState } from 'react'

const ROOM_ID = process.env.NEXT_PUBLIC_MEGA_ROOM_ID
const TITLE   = process.env.NEXT_PUBLIC_MEGA_TITLE ?? 'World Cup Final Mega Contest'
const PRIZE   = process.env.NEXT_PUBLIC_MEGA_PRIZE

export function MegaContest() {
  const [copied, setCopied] = useState(false)
  if (!ROOM_ID) return null

  const href = `/fantasy/room/${ROOM_ID}`
  const share = () => {
    const url = `${window.location.origin}${href}`
    if (navigator.share) {
      navigator.share({ title: TITLE, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl pitch-bg-dark border border-white/10 shadow-lg">
      <div className="pitch-sweep" />
      <div className="relative px-5 sm:px-8 py-6 sm:py-7">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-pulse-200">
          <span className="w-1.5 h-1.5 rounded-full bg-pulse-300 live-dot" />
          Grand Final Contest
        </div>

        <h2 className="mt-2.5 text-2xl sm:text-3xl font-black text-white leading-tight">{TITLE}</h2>

        <p className="mt-2 text-sm text-white/75 max-w-lg leading-relaxed">
          One room, one match: the World Cup Final. Draft your XI and climb the live leaderboard
          {PRIZE ? <> to win <span className="font-semibold text-white">{PRIZE}</span></> : null}.
          Spots are limited and fill first-come, so join early to claim yours.
        </p>

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
