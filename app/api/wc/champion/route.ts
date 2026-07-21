/**
 * GET /api/wc/champion
 * ═════════════════════
 * Celebration data for the WC 2026 champions (Spain, team 9). Stats, the road
 * to the title, and the team's top scorer are pulled live from API-Football and
 * aggregated. Heavily cached - the tournament is over, this never changes.
 */

import { NextResponse } from 'next/server'

const BASE = 'https://v3.football.api-sports.io'
const CHAMPION_ID = 9          // Spain
const CHAMPION_NAME = 'Spain'
const YEAR = 2026

const FINISHED = new Set(['FT', 'AET', 'PEN'])

type Journey = {
  round: string; opponent: string; opponentId: number
  scored: number; conceded: number; result: 'W' | 'D' | 'L'; extra: string
}

async function af<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.APIFOOTBALL_KEY!, Accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`AF ${path} -> ${res.status}`)
  const json = await res.json()
  return json.response as T
}

// Shorten API round labels: "Group Stage - 2" -> "Group Stage", keep knockouts.
function roundLabel(round: string): string {
  if (/group/i.test(round)) return 'Group Stage'
  return round.replace('Round of 32', 'Round of 32').replace('Round of 16', 'Round of 16')
}

export async function GET() {
  try {
    const fixtures = await af<any[]>(`/fixtures?league=1&season=${YEAR}&team=${CHAMPION_ID}`)

    let played = 0, won = 0, drawn = 0, lost = 0, scored = 0, conceded = 0, cleanSheets = 0
    const journey: Journey[] = []

    for (const f of fixtures) {
      const st = f.fixture.status.short as string
      if (!FINISHED.has(st)) continue
      const home = f.teams.home, away = f.teams.away
      const gh = f.goals.home ?? 0, ga = f.goals.away ?? 0
      const isHome = home.id === CHAMPION_ID
      const sf = isHome ? gh : ga
      const sa = isHome ? ga : gh
      const opp = isHome ? away : home

      played++; scored += sf; conceded += sa
      if (sa === 0) cleanSheets++
      const result: 'W' | 'D' | 'L' = sf > sa ? 'W' : sf === sa ? 'D' : 'L'
      if (result === 'W') won++; else if (result === 'D') drawn++; else lost++

      journey.push({
        round: roundLabel(f.league.round),
        opponent: opp.name, opponentId: opp.id,
        scored: sf, conceded: sa, result,
        extra: st === 'AET' ? 'AET' : st === 'PEN' ? 'PENS' : '',
      })
    }

    const final = journey[journey.length - 1] ?? null

    // Top scorer among champion's players
    let topScorer: { name: string; goals: number; photo: string } | null = null
    try {
      const scorers = await af<any[]>(`/players/topscorers?league=1&season=${YEAR}`)
      const spanish = scorers.filter(p => p.statistics?.[0]?.team?.id === CHAMPION_ID)
      const top = spanish.sort((a, b) => (b.statistics[0].goals.total ?? 0) - (a.statistics[0].goals.total ?? 0))[0]
      if (top) topScorer = {
        name: top.player.name,
        goals: top.statistics[0].goals.total ?? 0,
        photo: top.player.photo ?? `https://media.api-sports.io/football/players/${top.player.id}.png`,
      }
    } catch { /* awards section just hides if unavailable */ }

    return NextResponse.json(
      {
        team: { id: CHAMPION_ID, name: CHAMPION_NAME, logo: `https://media.api-sports.io/football/teams/${CHAMPION_ID}.png` },
        year: YEAR,
        stats: { played, won, drawn, lost, scored, conceded, cleanSheets },
        final,
        journey,
        topScorer,
      },
      { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
