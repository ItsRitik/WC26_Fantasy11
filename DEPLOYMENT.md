# WC26 Fantasy XI - Production Deployment Checklist (Vercel)

Work top to bottom. Items marked **[BLOCKER]** will break the live app if skipped.

## 1. Secrets & environment variables (Vercel - Project Settings - Environment Variables)
Set every var for the **Production** environment. Do NOT commit `.env.local` (already gitignored).

- [ ] **[BLOCKER]** `SCORING_SECRET` - generate a strong random value (`openssl rand -hex 32`).
      It is currently `dev-secret-change-me` locally; the cron auth depends on it.
- [ ] **[BLOCKER]** `NEXT_PUBLIC_BASE_URL` = your real HTTPS domain (e.g. `https://wc26fantasyxi.app`).
      The scoring cron calls its own API routes through this URL; localhost will fail in prod.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **[BLOCKER]** `SUPABASE_SERVICE_ROLE_KEY` - server-side only. Never expose to the browser.
- [ ] `APIFOOTBALL_KEY` (server) and `NEXT_PUBLIC_APIFOOTBALL_KEY` (browser widget only)
- [ ] Clerk keys - see section 3.

## 2. Supabase
- [ ] **[BLOCKER]** Run all pending migrations in the SQL editor (no CLI is linked):
      - `migration-2026-06-11-match-player-points.sql`
      - `migration-2026-06-12-points-log.sql`
      - `migration-2026-06-15-multi-team-rooms.sql`
      - `migration-2026-06-16-clerk-auth.sql`
      - `migration-2026-06-16-player-prices.sql`
- [ ] Confirm Realtime publication includes `fantasy_live_state`, `fantasy_room_members`, `fantasy_picks`
      (the multi-team migration adds these).
- [ ] Review RLS: reads are membership-based; all writes go through Clerk-authed API routes using
      the service-role client. Verify no table is world-writable.

## 3. Clerk (auth) - switch from test to production
- [ ] **[BLOCKER]** Create a **Production instance** in the Clerk dashboard and add your domain.
- [ ] Swap the test keys for live keys in Vercel:
      `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`, `CLERK_SECRET_KEY=sk_live_...`
      (local currently uses `pk_test_`/`sk_test_`).
- [ ] Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/fantasy/login`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/fantasy/signup`.
- [ ] In Clerk: enable **Email** sign-in with a verification **code**, and **disable Phone**
      (otherwise sign-up asks for a phone number).
- [ ] Add the production domain to Clerk's allowed origins / redirect URLs.

## 4. API-Football
- [ ] **[BLOCKER]** The current key **expires 2026-07-09** (mid-tournament). Renew before then.
- [ ] Plan limits: Pro = 7,500 req/day, 300 req/min. Caching is already in place
      (lineups 60s, fixtures/events short TTL, player season 24h, prices 6h). Watch usage on matchdays.

## 5. Scoring cron (GitHub Actions - no Vercel Pro)
Scoring is driven by `.github/workflows/scoring-cron.yml`, which pings
`GET /api/scoring/cron` (auth `Authorization: Bearer $SCORING_SECRET`). `vercel.json`
was removed because Hobby caps crons at once/day.
- [ ] **[BLOCKER]** Make the repo **public** - GitHub Actions minutes are unlimited for public
      repos. This pinger runs ~24/7 and would exceed the 2,000 free min/month on a private repo.
      (No secrets are committed, so public is safe.)
- [ ] **[BLOCKER]** Add repo secrets (Settings - Secrets and variables - Actions):
      `SCORING_BASE_URL` = your prod URL (no trailing slash), `SCORING_SECRET` = same value as Vercel.
- [ ] After deploy, open the **Actions** tab and run "Scoring cron" once via **Run workflow** to verify
      it returns HTTP 200.
- [ ] Cadence: GitHub's minimum schedule is every 5 min (best-effort); each run loops to ping ~once a
      minute across the window. Note GitHub disables scheduled workflows after 60 days of repo inactivity.
- [ ] Open rooms also self-heal via `/api/room/[roomId]/sync` (every ~30s while the page is open), so
      the Action mainly matters for rooms nobody currently has open.
- [ ] Alternative if you keep the repo private: a free external pinger (cron-job.org) hitting the same
      endpoint gives true 1-min cadence without using Action minutes.

## 6. Assets & metadata
- [x] Social card is generated dynamically by `app/opengraph-image.tsx` (1200x630, branded). No
      static PNG needed; Next auto-wires the og:image / twitter:image tags.
- [ ] Add `public/favicon.ico` / app icons if not present.

## 7. Security (done in code)
- [x] HTTPS is automatic on Vercel.
- [x] Security headers added in `next.config.js` (HSTS, X-Content-Type-Options, X-Frame-Options,
      Referrer-Policy, Permissions-Policy) and `X-Powered-By` is disabled.
- [x] No secrets committed (`.env.local` untracked; verified). `node_modules`/`.next` untracked.
- Note on "URL encryption": room ids are random **UUIDs** and `?match=` is a public API-Football
  fixture id, so both are already non-guessable/non-sensitive. AES-encrypting them adds bug surface
  for no real security gain, so it was intentionally **not** done. Say the word if you still want
  signed/opaque tokens for aesthetics.

## 8. Final checks
- [x] `npx tsc --noEmit` clean, `npx next build` passes.
- [ ] Smoke test on a Vercel Preview deploy before promoting to Production:
      sign in - create room - build an 11 - join from a 2nd account - verify live ticker sticks on a
      live match - verify points only finalise (clean sheet, tackles, etc.) at full-time.
- [ ] (Optional) Add error monitoring (Sentry) and uptime monitoring for the cron.
