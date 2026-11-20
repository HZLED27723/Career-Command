# Deploying CareerCommand Hub

The app is **local-first and fully static** — it builds to plain HTML/JS/CSS with
no backend, so it can be hosted anywhere. Your data lives in your browser
(IndexedDB); use the **Data & backup** button (sidebar, bottom-left) to move it
between devices.

> Node isn't on this machine's PATH by default. Prefix commands with:
> `export PATH="$HOME/.local/node22/bin:$PATH"`

---

## Fastest: Vercel CLI (one command, ~2 min)

From inside `careercommand-hub/`:

```bash
export PATH="$HOME/.local/node22/bin:$PATH"
npx vercel          # first run: log in via the browser link it prints
```

Answer the prompts (accept the defaults — it auto-detects Next.js). It gives you
a live preview URL. When you're happy:

```bash
npx vercel --prod   # promote to your permanent production URL
```

That's it — you'll have a real link you can open and install on any device.

---

## Alternative: GitHub → Vercel (auto-deploy on every change)

1. Create an empty repo on github.com (e.g. `careercommand-hub`).
2. Push this project to it:
   ```bash
   git remote add origin https://github.com/<you>/careercommand-hub.git
   git push -u origin main
   ```
3. On [vercel.com](https://vercel.com) → **Add New → Project** → import that repo →
   **Deploy**. Every future `git push` redeploys automatically.

Netlify and Cloudflare Pages work the same way (import the repo, framework
preset = Next.js).

---

## Install it as an app

Once it's live, open the URL in Chrome/Edge/Safari and choose **Install app**
(or Share → Add to Home Screen on mobile). It launches full-screen like a native
app, thanks to the bundled web manifest and icon.

---

## Cloud sync (accounts + multi-device) — SHIPPED

Data syncs across all devices via **Supabase** (login + Postgres). Each signed-in
user's whole dataset lives in one `user_data` row (see `supabase/schema.sql`),
mirrored from the local backup format; `lib/sync.ts` pulls it on login and
auto-pushes on every change.

**Required environment variables** (see `.env.example`):

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect / Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same place — the public/anon key |

These must be set **on Vercel** (Project → Settings → Environment Variables) and
then redeployed, because `NEXT_PUBLIC_*` values are baked into the build. Locally
they live in `.env.local` (git-ignored).

If the env vars are absent the app falls back to **local-only mode** (no login,
data stays in that browser) — so it never hard-fails.

---

## Two steps that still need you (2026-09-14)

The web app is deployed. These two touch the Supabase project, which needs your
login, so they can't be automated from here.

### 1. Run the schema (adds the AI research quota)

Open the Supabase **SQL editor** for project `qfeoidxzaqesyysskscq`, paste the
whole of [`supabase/schema.sql`](supabase/schema.sql) and run it. It is
idempotent — safe to re-run, and it does not touch existing rows.

This adds `research_usage` plus `consume_research_quota()`, which caps AI
lookups at **25 per user per day**. Change the `daily_limit` constant inside the
function if that's the wrong number. It is deliberately not a parameter: a limit
the caller passes in is a limit the caller can raise.

### 2. Deploy the research function

```bash
npx supabase login
npx supabase functions deploy research-company --project-ref qfeoidxzaqesyysskscq
```

Until this runs, the live function is the **old** one: no quota enforcement, and
no source citations. The app handles that gracefully — research still works, and
the Sources panel says the lookup predates source tracking rather than claiming
it found nothing.

Check the secret is still set (it isn't printed back):

```bash
npx supabase secrets list --project-ref qfeoidxzaqesyysskscq
```

### Deploying the web app

There's no git remote on this repo — deploys go straight from the CLI:

```bash
npx vercel --prod
```
