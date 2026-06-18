# ClipForge

> AI-powered clip finder for gamers. Turn long gameplay recordings and streams into short, shareable highlight clips automatically.

ClipForge ingests a gameplay video, uses Google Gemini to detect the most exciting
moments (kills, clutches, funny fails, rage moments), and lets you cut and download
each highlight as a standalone clip.

---

## How it works

```
┌──────────┐    upload      ┌─────────────┐   analyze (Gemini)   ┌────────────┐
│  Browser │ ─────────────► │ UploadThing │ ───────────────────► │  /api/     │
│ (Next.js)│   direct CDN   │   storage   │   fileUrl + game     │  analyze   │
└──────────┘                └─────────────┘                      └─────┬──────┘
     │                                                                 │ insert
     │   "Cut Clip"                                                    ▼
     │  ┌──────────┐    POST /api/cut    ┌──────────────────────┐   ┌──────────┐
     └─►│ /api/cut │ ──────────────────► │  Railway cutter      │   │ Supabase │
        │  (proxy) │   videoId, range    │  (Express + ffmpeg)  │   │ Postgres │
        └──────────┘                     └──────────┬───────────┘   └──────────┘
                                                    │ upload clip
                                                    ▼
                                            ┌──────────────┐
                                            │  Cloudinary  │  ◄── clip_url
                                            └──────────────┘
```

1. **Upload** — the browser uploads the raw video directly to **UploadThing** (no
   server round-trip), yielding a `*.ufs.sh` CDN URL.
2. **Analyze** — [`/api/analyze`](app/api/analyze/route.ts) sends the video to
   **Google Gemini**, which returns ~5 highlight moments with start/end times,
   a moment type, and a confidence score. The video and its clip rows are saved to
   **Supabase**.
3. **Cut** — on the clips page, each highlight can be cut. [`/api/cut`](app/api/cut/route.ts)
   forwards the request to a small **Railway-hosted Express + ffmpeg microservice**
   ([`clipforge-cutter`](../clipforge-cutter)), which downloads the source, trims the
   requested range, and uploads the result to **Cloudinary**, returning a `clip_url`.
4. **Download / export** — finished clips are downloaded in-tab as blobs;
   [`/api/export`](app/api/export/route.ts) handles export flows.

Thumbnails are generated client-side (a hidden `<video>` is seeked per clip and the
frame is drawn to a `<canvas>`) because Cloudinary "fetch" delivery is disabled for
this account.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS v4, shadcn/ui, Framer Motion |
| Auth & DB | Supabase (Postgres + Row Level Security + Auth, incl. anonymous sign-in) |
| Upload storage | UploadThing |
| AI analysis | Google Gemini (`gemini-2.5-flash`) |
| Clip rendering | Railway microservice (Express + ffmpeg) → Cloudinary |
| Rate limiting | Upstash Redis |
| Hosting | Vercel (web) + Railway (cutter) |

---

## Project structure

```
app/
  (app)/            Authenticated app shell (dashboard, clips, editor, exports, settings)
  (auth)/           Login, signup, OAuth callback
  api/              Route handlers: analyze, cut, export, uploadthing
components/
  ui/               shadcn/ui primitives
  motion/           Reduced-motion-aware animation primitives
lib/
  supabase/         Browser/server/middleware Supabase clients + profile helpers
  security/         env guard, security headers, rate limiting, input validators
proxy.ts            Next.js middleware (auth/session refresh)
```

---

## Local development

### Prerequisites

- Node.js 18.18+ (or 20+)
- [pnpm](https://pnpm.io/) 9+

### Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in your own credentials
pnpm dev                     # http://localhost:3000
```

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run unit tests (vitest) |

---

## Environment variables

See [`.env.example`](.env.example) for the full list. All are required unless noted.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `GEMINI_API_KEY` | Google Gemini API key (clip analysis) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `UPLOADTHING_TOKEN` | UploadThing app token |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CUTTER_URL` | _(optional)_ Override the Railway cutter base URL |

> The cutter microservice has its own environment — see
> [`../clipforge-cutter/.env.example`](../clipforge-cutter/.env.example).

---

## Deployment

- **Web app** → Vercel. Pushes to `main` auto-deploy via the GitHub integration.
- **Cutter** → Railway (`clipforge-cutter` service). Deployed with `railway up` from
  the [`clipforge-cutter`](../clipforge-cutter) directory.

---

## Security notes

- All Supabase access is gated by Row Level Security scoped to `auth.uid()`.
- API routes validate input shapes ([`lib/security/validators.ts`](lib/security/validators.ts)),
  reject unexpected body keys, and rate-limit per IP via Upstash.
- The post-login `?next=` redirect is validated against open-redirect tricks.
- Security headers are applied centrally in [`lib/security/headers.ts`](lib/security/headers.ts).
