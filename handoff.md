# Handoff

## Latest commit
`14b912c` — "Bug fixes, UI polish, and new features across the app" (on `main`, deployed to production via Vercel Git integration)

## What changed in this session

### Bug fixes
- Editor page: `xl:grid-cols-[1fr,320px]` was invalid CSS (comma instead of underscore) — the Batch Export sidebar stacked below the grid instead of beside it. Fixed to `[1fr_320px]` and verified the computed style in-browser.
- [shader-background.tsx](components/ui/shader-background.tsx): GL viewport was multiplied by the DPR scale twice (canvas dimensions already include it), distorting output on high-DPI screens; also added a WebGL2-unavailable guard so old GPUs don't crash the app.
- [navbar.tsx](components/navbar.tsx) / [app-sidebar.tsx](components/app-sidebar.tsx): Supabase calls inside `onAuthStateChange` deferred via `setTimeout` (documented deadlock risk in supabase-js).
- Dashboard: videos now ordered newest-first; delete verifies ownership before removing clip rows (previously could toast success without deleting anything).
- [api/cut/route.ts](app/api/cut/route.ts): cutter 400s (e.g. clip range outside video) now pass through as 400 instead of being masked as 500.
- [api/analyze/route.ts](app/api/analyze/route.ts): Gemini output sanitized before insert (numeric coercion, reversed/out-of-range rows dropped, confidence clamped); prompt now honors the user's selected moment types and includes the video duration.
- [upload/page.tsx](app/(app)/upload/page.tsx): video duration measured client-side and sent as `durationSec` (was never sent → usage_minutes never tracked).
- Editor prefers the stored `title` column like the other pages; video cards no longer render an empty duration badge.
- `CUTTER_SECRET` documented in both `.env.example` files (cutter fails closed without it).
- clipforge-cutter (separate repo, not deployed here): download stream error handling, redirect body draining, 30s idle timeout.

### Features
- Dashboard stats row: videos in library / highlights detected / clips cut & ready.
- Clips workspace: per-clip preview player dialog (cut clips play their file; uncut clips play the source seeked to the detected range) + hover play overlay; "Cut all (n)" batch button (sequential, per-clip failure tolerant).
- Sidebar now links to `/exports` (page was previously unreachable from the UI).
- Exports: "Copy link" action in the row dropdown.
- Settings: Plan & Usage card (plan badge, footage-analyzed minutes, member since).

## Verification done
- `npx tsc --noEmit` clean, 26/26 vitest tests pass, `pnpm build` clean (Next 16.2.6).
- Browser-checked via preview as guest: landing, dashboard (stats hidden when empty, no errors), upload, exports, settings (Plan & Usage renders) — zero console errors.
- Deployed: pushed to `main`, GitHub deployment for `14b912c` reached `success`; production domain https://clipforge-swart.vercel.app returns 200.

## Remaining open items
- **Analyze route never sends the video to Gemini** — text-only prompt, so detected moments are fabricated. Real fix needs Gemini Files API upload, which doesn't fit Vercel serverless limits; likely belongs in the Railway cutter service. Architecture decision pending.
- Vercel CLI token on this machine is expired (`vercel login` needed for CLI deploys); Git-integration deploys work fine.
- `styles/globals.css` (unused shadcn boilerplate) still present, low priority.
