'use client'

/**
 * OnboardingGate - blocking modal shown after login until the user has picked a
 * UNIQUE username (display_name). This is their identity across every room, so
 * it is mandatory and cannot be skipped or dismissed: no close button, no
 * backdrop-close, and the app stays gated until a valid name is saved.
 *
 * Mounted globally in the root layout, so it gates the whole app.
 */

import { useState } from 'react'
import useSWR from 'swr'
import clsx from 'clsx'
import { useAuth } from '@/lib/hooks/useAuth'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
  return json
}

export function OnboardingGate() {
  const { user, loading: authLoading } = useAuth()

  const { data: prof, mutate } = useSWR<{ complete: boolean; profile: { display_name?: string } | null }>(
    user ? '/api/profile' : null, fetcher, { revalidateOnFocus: false },
  )

  const needsOnboarding = !!user && prof !== undefined && !prof.complete

  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const nameValid = name.trim().length >= 3 && name.trim().length <= 16

  async function save() {
    if (saving || !nameValid) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Could not save')
      await mutate()   // profile now complete → gate closes
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (!needsOnboarding || authLoading) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-xl overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-pulse-600 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Choose your username</h2>
          <p className="text-xs text-gray-400 mt-1">
            This is your identity on every leaderboard. It must be unique, and you&apos;ll need it to join a contest.
          </p>
        </div>

        <div className="p-6 pt-4">
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            onKeyDown={e => { if (e.key === 'Enter' && nameValid) save() }}
            maxLength={16}
            placeholder="e.g. RitikTheGreat"
            className="w-full h-11 px-4 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pulse-400"
          />
          <p className="text-[10px] text-gray-400 mt-2">3 to 16 characters: letters, numbers, spaces, _ . -</p>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <button
            onClick={save}
            disabled={!nameValid || saving}
            className={clsx(
              'mt-4 w-full h-11 rounded-xl text-sm font-semibold transition-colors',
              nameValid && !saving ? 'bg-pulse-600 hover:bg-pulse-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
