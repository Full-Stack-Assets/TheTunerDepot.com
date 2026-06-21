# The Tuner Depot

A self-hosted, near-zero-cost car-culture blog. A scheduled job runs every hour, picks the highest-signal story from seven sources, researches it, writes a structured MDX post, and commits it to GitHub. The Next.js site auto-deploys.

**Stack:** Next.js 15 · TinaCMS · Google Gemini (free tier) · Brave Search · Pexels · GitHub Contents API · Vercel.

**Monthly cost at steady state:** ~$0.

> Built on a reusable auto-blog engine. Everything niche-specific lives in **`src/site.config.ts`** — see [`CREATE-A-SITE.md`](./CREATE-A-SITE.md) to spin up a different niche from the same code.

---

## How it works

```
 ┌─ Reddit ──────┐
 │ Hacker News  │
 │ DEV.to       │
 │ RSS          │──▶ score ──▶ dedup ──▶ winner ──▶ research ──▶ Gemini ──▶ MDX ──▶ git commit ──▶ deploy
 │ YouTube      │   (pop + engagement + recency)   (Brave + scrape    (strict JSON
 │ Brave News   │                                   + YT transcripts)   contract)
 └─ Google Trends┘
```

Each stage is its own module in `src/lib/orchestrator/` and can be tested independently. The `pipeline.ts` runner wires them together with per-stage timings and graceful fallbacks — a flaky source doesn't kill the run.

---

## Setup

### 1. Prereqs

- Node 20+
- npm (the repo ships a `package-lock.json`; CI uses `npm ci`)
- A GitHub repo to commit posts into (can be this same repo)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

### 3. Get the free API keys

| Key | Where | Free tier |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | ~1,500 requests/day on `gemini-flash-latest` |
| `BRAVE_API_KEY` | https://api.search.brave.com/app/keys | 2,000 queries/month on the free plan |
| `PEXELS_API_KEY` | https://www.pexels.com/api/new/ | Unlimited for dev use (or use keyless `openverse`) |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | https://www.reddit.com/prefs/apps ("script" app) | Free |
| `GITHUB_TOKEN` | github.com → Settings → Developer settings → Fine-grained PAT | Scope: **Contents: Read/Write** on the blog repo only |
| `CRON_SECRET` | `openssl rand -hex 32` | — |

The writer LLM key name must match `llm.apiKeyEnv` in `src/site.config.ts` (**`GEMINI_API_KEY`** by default; swap to `GROQ_API_KEY` / `OPENROUTER_API_KEY` if you change providers). Fill the keys into `.env.local` along with `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH`.

> **⚠️ Security:** Never commit `.env.local` or any file containing real keys. It's already in `.gitignore`. Use `.env.example` (placeholders only) as the template.

### 4. Test locally

```bash
# Dry run — prints the generated post, doesn't write anything
npm run generate -- --dry

# Real run — writes MDX to content/posts/ and updates content/.topic-log.json
npm run generate

# Smoke-test the source fetchers (no keys needed for Reddit/HN/DEV.to/RSS)
npx tsx scripts/smoke-test.ts

# Start the dev server (Next + TinaCMS editor)
npm run dev
```

Open http://localhost:3000. New posts show up as soon as `npm run generate` writes them.

---

## Deploy

### Scheduling — GitHub Actions (the hourly tick)

The hourly schedule lives in **`.github/workflows/generate.yml`**, which runs at the top of every hour (`cron: '0 * * * *'`), executes the pipeline with `npx tsx scripts/run-local.ts`, and commits any new post straight to the repo. No serverless CPU limits, free logs, and the push triggers your host to redeploy. This is the scheduler — your host below just serves the site.

Add the pipeline secrets (`GEMINI_API_KEY`, `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) under **Settings → Secrets and variables → Actions**. The workflow has `contents: write` and a `concurrency` group so a slow run never overlaps the next tick. Use the **Run workflow** button (`workflow_dispatch`) to trigger a one-off run.

A second workflow, **`.github/workflows/newsletter.yml`**, sends a weekly digest (Mondays 14:00 UTC) when the newsletter is configured.

> **Why not a Vercel cron?** Vercel's Hobby (free) plan caps cron jobs at **once per day**, so an hourly tick there would be throttled. To stay at $0, scheduling lives in GitHub Actions. On Vercel **Pro** you can instead add an hourly entry to `vercel.json` pointing at `/api/cron/generate` — the route already handles `Authorization: Bearer $CRON_SECRET`. Don't run both at once or you'll generate twice an hour.

### Hosting — Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel (it auto-detects Next.js).
3. Add every env var from `.env.local` to the Vercel project, and add your domain under Settings → Domains.

Vercel auto-deploys on every push, so each hourly commit from the Action redeploys the site. Optionally set a `VERCEL_DEPLOY_HOOK_URL` secret to force a production redeploy after each post.

### Self-host

`npm run build && npm start` and point a reverse proxy at port 3000. The GitHub Action still drives generation; to trigger a run by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/generate
```

---

## TinaCMS editor (optional)

The schema in `tina/config.ts` matches the frontmatter the pipeline emits. Start the editor with `npm run dev`, then visit http://localhost:3000/admin/index.html to fix typos, tweak tags, or hand-write posts.

**Self-hosted mode (default):** TinaCMS works in local filesystem mode with no cloud credentials. `scripts/build.sh` skips the Tina cloud build when credentials aren't provided.

**Hosted editing:** For non-local contributors, sign up at tina.io (free tier) and set `NEXT_PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` in your deployment env. Optional for local development.

---

## The MDX contract

Every generated post follows this exact shape — the system prompt in `src/lib/orchestrator/generate.ts` enforces it, and a self-healing zod schema validates the JSON before writing:

1. **Lead paragraph** (no heading, 3–5 sentences)
2. `<Callout type="takeaway">` — one-sentence synthesis
3. `## What happened`
4. `## Why it matters`
5. `<ProsCons>` block with 3+ items per side
6. `## How to think about it`
7. `<Callout type="warning">` — *optional*, only if warranted
8. `## FAQ` with exactly 3 `<Question>` entries

All components are implemented in `src/components/mdx/index.tsx` and styled via `globals.css`'s `.prose-editorial` rules.

---

## Scoring

From `src/lib/orchestrator/score.ts`:

```
score = 0.5·popularity + 0.2·engagement + 0.3·recency
```

- **popularity** — log-scaled upvotes, normalized per-source, then weighted by source (HN=1.0, Brave=0.9, Reddit=0.85, Google Trends=0.8, DEV=0.75, RSS=0.7, YT=0.6).
- **engagement** — comments-to-upvotes ratio (capped at 1.0)
- **recency** — exponential decay with a **24h half-life**

Dedup uses a sorted-token fingerprint of the title, so "New Supra revealed today" and "Today: the new Supra is here" collapse to the same signature. The topic log (`content/.topic-log.json`) is checked on every run and capped at 500 entries.

---

## Troubleshooting

**"no items from any source"** — every source failed. Usually a network blip; check logs and try `npm run generate -- --dry` after a minute.

**"all top candidates already covered"** — the scorer found winners, but every one's signature is already in the topic log. Wait for new stories or delete recent entries from `content/.topic-log.json`.

**"no research content scrapable"** — the winner's URL and the Brave results all failed to scrape (timeouts, 403s, JS-only pages). The pipeline skips gracefully; try again next tick.

**LLM rate limit** — the free tier resets on a fixed window. One post/hour stays comfortably under the limit; if you're iterating locally, just wait a minute.

---

## Extending

- **Add a source:** drop a new file in `src/lib/sources/`, export a function returning `RawItem[]`, add the source literal to the union in `src/lib/orchestrator/types.ts`, give it a weight in `score.ts`, and add it to the `Promise.all` in `pipeline.ts`.
- **Tune the tone:** edit `SYSTEM_PROMPT` in `generate.ts`. The zod schema will catch anything structurally broken.
- **Change the niche or sources:** edit `src/site.config.ts` (`audience`, `categories`, and the `subreddits` / `rssFeeds` / `braveQueries` under `sources`).
- **Change the cadence:** edit the `cron` in `.github/workflows/generate.yml` (e.g. `0 */2 * * *` for every two hours, `0 12 * * *` for daily).

---

## License

MIT — do whatever you want with it.
