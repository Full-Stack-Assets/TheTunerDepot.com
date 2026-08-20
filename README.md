# The Tuner Depot

A statically deployed automotive publication. A scheduled job runs every hour,
picks the highest-signal car-culture story from the configured sources,
researches it, writes a structured MDX post, and commits it to GitHub. The
existing Pages workflow publishes successful generation runs.


**Monthly cost at steady state:** $0.

---

## How it works

```
 ┌─ Reddit ─┐
 │ HN      │
 │ DEV.to  │──▶ score ──▶ dedup ──▶ winner ──▶ research ──▶ Groq ──▶ MDX ──▶ git commit ──▶ deploy
 │ RSS     │   (pop + engagement + recency)    (Brave + scrape     (strict JSON
 │ YouTube │                                    + YT transcripts)   contract)
 └─ Brave ─┘
```

Each stage is its own module in `src/lib/orchestrator/` and can be tested independently. The `pipeline.ts` runner wires them together with per-stage timings and graceful fallbacks — a flaky source doesn't kill the run.

---

## Setup

### 1. Prereqs

- Node 20+
- `npm` (the repository ships `package-lock.json`; CI uses `npm ci`)
- A GitHub repo to commit posts into (can be this same repo)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

### 3. Get the free API keys

| Key | Where | Free tier |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys | Writer access for the configured Groq model |
| `BRAVE_API_KEY` | https://api.search.brave.com/app/keys | 2,000 queries/month on the free plan |
| `PEXELS_API_KEY` | https://www.pexels.com/api/new/ | Unlimited for dev use |
| `GITHUB_TOKEN` | github.com → Settings → Developer settings → Fine-grained PAT | Scope: **Contents: Read/Write** on the blog repo only |

Fill them into `.env.local` along with `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH`.

> **⚠️ Security Note:** Never commit `.env.local` or any file containing real API keys to version control. The `.env.local` file is already in `.gitignore` to prevent accidental commits. Always use `.env.example` as a template with placeholder values only.

### 4. Test locally

```bash
# Dry run — prints the generated post, doesn't write anything
npm run generate -- --dry

# Real run — writes MDX to content/posts/ and updates content/.topic-log.json
npm run generate

# Start the dev server
npm run dev
```

Open http://localhost:3000. New posts show up as soon as `npm run generate` writes them.

---

## Deploy

### Scheduling — GitHub Actions (the hourly tick)

The hourly schedule lives in **`.github/workflows/generate.yml`**, which runs at
the top of every hour, executes the pipeline with `npx tsx scripts/run-local.ts`,
and commits any new post to the repository. A successful run triggers the
existing GitHub Pages workflow, avoiding reliance on recursive bot pushes.

Add the pipeline secrets (`GROQ_API_KEY`, `BRAVE_API_KEY`, `PEXELS_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) under **Settings → Secrets and variables → Actions**. The workflow has `contents: write` and a `concurrency` group so a slow run never overlaps the next tick. Use the **Run workflow** button (`workflow_dispatch`) to trigger a one-off run.

### Hosting — GitHub Pages

The approved production path is **`.github/workflows/pages.yml`**. It exports
the site to `out/`, verifies `out/index.html` and `out/CNAME`, and deploys with
GitHub Pages. In **Settings → Pages**, set Source to **GitHub Actions** and add
`thetunerdepot.com` as the custom domain. Public newsletter and monetization
settings belong under Actions variables.

---

## TinaCMS editor (optional)

The schema in `tina/config.ts` matches the frontmatter the pipeline emits. Start the editor with:

```bash
npm run dev   # Tina runs alongside Next via the `tinacms dev` wrapper
```

Then visit http://localhost:3000/admin/index.html. You can fix typos, tweak tags, or hand-write posts that follow the same structure.

**Self-hosted mode (default):** TinaCMS works in local filesystem mode without any cloud credentials. The build script (`scripts/build.sh`) automatically handles this by setting placeholder values during build if credentials aren't provided.

**Hosted editing:** For non-local contributors, sign up at tina.io for the free tier and fill in `NEXT_PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` in your deployment environment variables. These are optional for local development.

---

## The MDX contract

Every generated post follows this exact shape — the system prompt in `src/lib/orchestrator/generate.ts` enforces it, and the zod schema validates the JSON before writing:

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

- **popularity** — log-scaled upvotes, normalized per-source, then weighted by source (HN=1.0, Reddit=0.85, Brave=0.9, Google Trends=0.8, DEV=0.75, RSS=0.7, YT=0.6). Google Trends maps each trending search's approximate traffic to the "upvotes" axis and is filtered to tech/AI/business terms so the blog stays on-niche.
- **engagement** — comments-to-upvotes ratio (capped at 1.0)
- **recency** — exponential decay with a **24h half-life**

Dedup uses a sorted-token fingerprint of the title, so "GPT-5 released today" and "Today: GPT-5 is out" collapse to the same signature. The topic log (`content/.topic-log.json`) is checked on every run and capped at 500 entries.

---

## Troubleshooting

**"no items from any source"** — all sources failed. Usually a network blip; check logs. Try `npm run generate -- --dry` after a minute.

**"all top candidates already covered"** — the scorer found winners, but every one has a signature that's already in the topic log. Either wait for new stories or delete recent entries from `content/.topic-log.json`.

**"no research content scrapable"** — the winner's URL and all three Brave results failed to scrape (timeouts, 403s, JS-only pages). The pipeline skips gracefully; try again next tick.

**Groq rate limit** — the free tier resets every minute. One post/hour stays comfortably under the limit, but if you're iterating locally, just wait a minute.

**Pages configuration fails with “Not Found”** — enable GitHub Pages in repository Settings and select **GitHub Actions** as the source before rerunning the workflow.

---

## Extending

- **Add a source:** drop a new file in `src/lib/sources/`, export a function returning `RawItem[]`, and add it to the `Promise.all` in `pipeline.ts`.
- **Tune the tone:** edit `SYSTEM_PROMPT` in `generate.ts`. The zod schema will catch anything structurally broken.
- **Change the niche:** adjust `SUBREDDITS` in `reddit.ts`, `BRAVE_QUERIES` in `bravenews.ts`, and `DEFAULT_FEEDS` in `rss.ts`.
- **Change the cadence:** edit the `cron` in `.github/workflows/generate.yml` (e.g. `0 */2 * * *` for every two hours, `0 12 * * *` for daily). For multiple posts per tick, call `runPipeline()` in a loop with different category filters.

---

## Server-runtime build

GitHub Pages remains the active production deployment until Human Authority
selects and configures the replacement server host. The repository can also
produce a provider-neutral Node.js runtime without changing that production
boundary:

~~~bash
npm run build:server
HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
~~~

The server build uses Next.js standalone output and packages both `public/`
and `.next/static/`, preventing browser assets from returning 404 after
deployment. A successful local build is not evidence of a production rollout;
the approved host, secrets, custom-domain routing, health checks, and live-route
verification are still required before changing the production claim.

---

## License

MIT — do whatever you want with it.
