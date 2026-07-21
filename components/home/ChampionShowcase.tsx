'use client'

/**
 * ChampionShowcase - a scroll-driven celebration of the WC 2026 champions.
 * Data pulled live from /api/wc/champion. Uses Framer Motion for reveal-on-
 * scroll + count-ups, plus a canvas confetti burst. Respects reduced-motion.
 */

import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Journey = { round: string; opponent: string; opponentId: number; scored: number; conceded: number; result: 'W' | 'D' | 'L'; extra: string }
type ChampionData = {
  team: { id: number; name: string; logo: string }
  year: number
  stats: { played: number; won: number; drawn: number; lost: number; scored: number; conceded: number; cleanSheets: number }
  final: Journey | null
  journey: Journey[]
  topScorer: { name: string; goals: number; photo: string } | null
  error?: string
}

// ── Count-up that fires when scrolled into view ──────────────────────────────
function CountUp({ to, suffix = '', duration = 1.5 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) { setN(to); return }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000))
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduce])
  return <span ref={ref}>{n}{suffix}</span>
}

// ── Confetti burst on the hero ───────────────────────────────────────────────
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => { canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr }
    resize()
    const colors = ['#e11d2a', '#facc15', '#fbbf24', '#ffffff', '#f59e0b']
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height,
      r: (3 + Math.random() * 5) * dpr, vy: (2 + Math.random() * 3.5) * dpr,
      vx: (-1.2 + Math.random() * 2.4) * dpr, rot: Math.random() * Math.PI, vr: -0.25 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    let raf = 0, frame = 0
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.035 * dpr; p.rot += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore()
      }
      if (frame < 320) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
}

const reveal = {
  hidden: { opacity: 0, y: 44 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export function ChampionShowcase() {
  const { data } = useSWR<ChampionData>('/api/wc/champion', fetcher, { revalidateOnFocus: false })
  const reduce = useReducedMotion()
  const anim = reduce
    ? { initial: 'show' as const }
    : { initial: 'hidden' as const, whileInView: 'show' as const, viewport: { once: true, amount: 0.3 } }

  if (!data || data.error || !data.stats) return null
  const { team, year, stats, final, journey, topScorer } = data

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#07070c] text-white border border-white/10 shadow-2xl">
      {/* warm stadium glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(80% 55% at 50% 0%, rgba(225,29,42,0.25), transparent 60%), radial-gradient(70% 60% at 50% 100%, rgba(250,204,21,0.14), transparent 55%)' }} />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="relative min-h-[86vh] flex flex-col items-center justify-center text-center px-6 py-16">
        <Confetti />
        <motion.div
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={reduce ? {} : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 blur-2xl rounded-full bg-amber-400/30 scale-125" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.logo} alt={team.name} className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain float-y drop-shadow-2xl"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }} />
        </motion.div>

        <motion.p initial={reduce ? false : { opacity: 0, y: 20 }} animate={reduce ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}
          className="mt-8 text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
          FIFA World Cup {year}
        </motion.p>
        <motion.h1 initial={reduce ? false : { opacity: 0, y: 24 }} animate={reduce ? {} : { opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-3 text-5xl sm:text-7xl font-black tracking-tight leading-[0.95]">
          {team.name}
        </motion.h1>
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={reduce ? {} : { opacity: 1 }} transition={{ delay: 0.75, duration: 0.8 }}
          className="mt-3 text-lg sm:text-2xl font-semibold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
          Champions of the World
        </motion.p>

        {!reduce && (
          <motion.div className="absolute bottom-8 flex flex-col items-center gap-1 text-white/40"
            animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </motion.div>
        )}
      </div>

      {/* ── The Final ───────────────────────────────────────────── */}
      {final && (
        <motion.div variants={reveal} {...anim} className="relative px-6 py-20 text-center border-t border-white/5">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">The Final{final.extra ? ` · ${final.extra}` : ''}</p>
          <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.logo} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
            <div className="text-5xl sm:text-7xl font-black tabular-nums">
              {final.scored}<span className="text-white/30 font-light mx-2">-</span>{final.conceded}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://media.api-sports.io/football/teams/${final.opponentId}.png`} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain opacity-80" />
          </div>
          <p className="mt-4 text-sm text-white/60">{team.name} beat {final.opponent} to lift the trophy.</p>
        </motion.div>
      )}

      {/* ── By the numbers ──────────────────────────────────────── */}
      <div className="relative px-6 py-20 border-t border-white/5">
        <motion.h2 variants={reveal} {...anim} className="text-center text-2xl sm:text-3xl font-black mb-10">By the numbers</motion.h2>
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { v: stats.scored, label: 'Goals scored' },
            { v: stats.won, label: 'Wins', suffix: `/${stats.played}` },
            { v: stats.conceded, label: 'Goals conceded' },
            { v: stats.cleanSheets, label: 'Clean sheets' },
          ].map((s, i) => (
            <motion.div key={s.label} variants={reveal} {...anim} transition={{ ...reveal.show.transition, delay: i * 0.08 }}
              className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-6 text-center">
              <div className="text-4xl sm:text-5xl font-black text-amber-300 tabular-nums">
                <CountUp to={s.v} />{s.suffix ?? ''}
              </div>
              <div className="text-[11px] text-white/50 mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
        <motion.p variants={reveal} {...anim} className="text-center text-white/50 text-sm mt-8">
          Unbeaten. <span className="text-white font-semibold">{stats.lost} losses</span> in {stats.played} games, only <span className="text-white font-semibold">{stats.conceded}</span> goal{stats.conceded === 1 ? '' : 's'} conceded all tournament.
        </motion.p>
      </div>

      {/* ── The road to glory ───────────────────────────────────── */}
      {journey.length > 0 && (
        <div className="relative px-6 py-20 border-t border-white/5">
          <motion.h2 variants={reveal} {...anim} className="text-center text-2xl sm:text-3xl font-black mb-10">The road to glory</motion.h2>
          <div className="max-w-md mx-auto space-y-2.5">
            {journey.map((m, i) => {
              const isFinal = i === journey.length - 1
              return (
                <motion.div key={i} variants={reveal} {...anim} transition={{ ...reveal.show.transition, delay: Math.min(i, 8) * 0.06 }}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isFinal ? 'bg-amber-400/10 border-amber-400/40' : 'bg-white/[0.03] border-white/10'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 w-24 flex-shrink-0">{m.round}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{m.opponent}</span>
                  <span className="text-sm font-black tabular-nums">{m.scored}-{m.conceded}</span>
                  <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center flex-shrink-0 ${m.result === 'W' ? 'bg-emerald-500 text-white' : m.result === 'D' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{m.result}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Star of the tournament ──────────────────────────────── */}
      {topScorer && (
        <motion.div variants={reveal} {...anim} className="relative px-6 py-20 border-t border-white/5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40 mb-6">Leading scorer</p>
          <div className="inline-flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 blur-xl rounded-full bg-amber-400/25 scale-110" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={topScorer.photo} alt={topScorer.name} className="relative w-24 h-24 rounded-full object-cover border-2 border-amber-400/50"
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
            </div>
            <h3 className="mt-4 text-xl font-black">{topScorer.name}</h3>
            <p className="text-amber-300 font-bold mt-0.5"><CountUp to={topScorer.goals} /> goals</p>
          </div>
        </motion.div>
      )}

      {/* ── Close ───────────────────────────────────────────────── */}
      <motion.div variants={reveal} {...anim} className="relative px-6 py-16 text-center border-t border-white/5">
        <p className="text-2xl sm:text-3xl font-black">¡Campeones!</p>
        <p className="text-white/50 text-sm mt-2">Thanks for playing WC26 Fantasy XI. Until the next one.</p>
      </motion.div>
    </section>
  )
}
