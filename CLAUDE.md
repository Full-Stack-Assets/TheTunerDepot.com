# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted, near-zero-cost auto-blog engine. A scheduled GitHub Action runs hourly, pulls candidate stories from seven sources, scores and dedupes them, researches the winner, has an LLM write a structured MDX post, commits it to the repo, and the Next.js site auto-deploys on Vercel.

This particular deployment is **The Tuner Depot** (car-culture niche), but the codebase is a reusable template: everything niche-specific lives in `src/site.config.ts`. See `CREATE-A-SITE.md` for spinning up a new niche from the same engine.

**`src/site.config.ts` is the single source of truth** for branding, niche, sources, and LLM provider. The live engine is configured for **Google Gemini** (`gemini-flash-latest`). When any other file disagrees with `site.config.ts`, treat the config as authoritative. (`README.md`, `CREATE-A-SITE.md`, and the user-facing pages all read from or are kept in sync with it.)

## Commands

The project ships a `package-lock.json` and CI uses **npm** (`npm ci`). The README mentions pnpm; either works, but npm matches CI.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server + TinaCMS editor (`tinacms dev -c "next dev"`). Site at `localhost:3000`, editor at `/admin/index.html`. |
| `npm run build` | Runs `bash scripts/build.sh` — builds the Tina admin only if Tina Cloud creds are set, then `next build`. |
| `npm start` | Serve the production build. |
| `npm run lint` | `next lint`. |
| `npm run generate` | Run the content pipeline locally (`tsx scripts/run-local.ts`). Writes MDX to `content/posts/` and updates `content/.topic-log.json`. Add `--dry` to print output without writing anything. |
| `npm run digest` | Send the weekly newsletter digest (`scripts/newsletter-digest.ts`). |
| `npx tsx scripts/smoke-test.ts` | Exercise each source fetcher against live APIs (no keys needed for Reddit/HN/DEV.to/RSS). Use this to debug a failing source. |

There is no unit test suite. `smoke-test.ts` is the closest thing to a test — it verifies each source returns items.

Local runs need `.env.local` (copy from `.env.example`). At minimum the LLM key (`GEMINI_API_KEY` by default — must match `llm.apiKeyEnv` in `site.config.ts`). Other source/syndication/newsletter keys are optional; any unset source or integration is skipped gracefully.

## Pipeline architecture (the core)

The generation pipeline is the heart of the system. It lives in `src/lib/orchestrator/` and is wired together by `pipeline.ts` → `runPipeline()`. Each stage is an independent module with graceful fallbacks — a flaky source or a failed scrape never kills the run; it skips and returns a structured result with per-stage timings.

```
sources/*  →  score.ts  →  research.ts  →  generate.ts  →  image.ts  →  serialize.ts  →  github.ts
 (gather)     (score +     (scrape +       (LLM writes     (hero      (MDX + YAML      (commit + topic
              dedup +      transcripts)     JSON post)      image)     frontmatter)     log update)
              pick winner)
```

Stages, in order (`pipeline.ts`):

1. **Gather** — `src/lib/sources/*` each export a fetcher returning `RawItem[]`: `reddit`, `hackernews`, `devto`, `rss`, `youtube`, `bravenews`, `googletrends`. All run in parallel via `Promise.all`, each wrapped in `.catch(() => [])`.
2. **Score & pick** — `score.ts`: `score = 0.5·popularity + 0.2·engagement + 0.3·recency`. Popularity is log-scaled, source-weighted (HN 1.0, Brave 0.9, Reddit 0.85, Trends 0.8, DEV 0.75, RSS 0.7, YouTube 0.6) and normalized per-source; recency uses a 24h half-life. `dedupe()` collapses items by a sorted-token `signature()` of the title. `pickWinner()` skips any candidate whose signature is already in the topic log.
3. **Research** — `research.ts`: scrapes the winner's URL plus Brave results (Cheerio) and pulls YouTube transcripts. Returns a `ResearchBundle`. If nothing is scrapable, the run skips.
4. **Generate** — `generate.ts`: calls the OpenAI-compatible LLM endpoint (from `site.config.ts`) and validates the JSON against `PostSchema` (a **self-healing** zod schema). See the contract below.
5. **Image** — `image.ts`: picks a hero image via the configured `imageProvider` (`pexels` | `openverse` | `none`).
6. **Serialize** — `serialize.ts`: emits a full MDX file with YAML frontmatter whose shape matches `tina/config.ts`. `sanitizeBody()` repairs unescaped quotes in `<Question q="...">` that would break MDX parsing.
7. **Commit** — `github.ts`: uses Octokit Contents API to write `content/posts/<slug>.mdx` and append to `content/.topic-log.json` (capped at 500 entries).

All inter-stage data shapes are defined in `src/lib/orchestrator/types.ts` (`RawItem`, `ScoredItem`, `ResearchBundle`, `GeneratedPost`, `TopicLog`). Read this file first when changing anything in the pipeline.

### Two execution paths — important distinction

- **`runPipeline({ dryRun: false })`** (called by `src/app/api/cron/generate/route.ts`) commits directly to GitHub via Octokit and reads/writes the topic log on GitHub.
- **`scripts/run-local.ts`** (the `npm run generate` / GitHub Action path) calls `runPipeline({ dryRun: true })` so the orchestrator never touches GitHub, then writes the MDX to the local filesystem itself and lets the **Action's git step** commit and push. After writing it also runs best-effort `syndicate()`.

So in normal operation, commits happen via git in the Action — not via the Octokit `commitPost`. The Octokit path is for the serverless cron route (e.g. Vercel Pro).

### The MDX generation contract

`generate.ts` holds `SYSTEM_PROMPT` (the writer instructions) and `PostSchema` (zod validation). The body must follow a fixed structure: lead paragraph → `<Callout type="takeaway">` → `## What happened` → `## Why it matters` → `<ProsCons>` → `## How to think about it` → optional `<Callout type="warning">` → `## FAQ` with exactly 3 `<Question>` entries.

`PostSchema` is **self-healing by design**: length/shape overshoots are repaired by transforms (`clampMeta`, `slugify`, `normalizeTags`) rather than throwing — `.max()` is deliberately omitted so transforms run. Only genuinely unrepairable misses (body < 800 chars, < 2 real tags, malformed JSON) trigger a retry, up to `MAX_GENERATION_ATTEMPTS` (3), feeding the exact rejection reason back to the model. When editing the prompt, keep it in sync with the schema and with the MDX components.

The MDX components (`Callout`, `ProsCons`/`Pros`/`Cons`, `FAQ`/`Question`) are implemented in `src/components/mdx/index.tsx` and must stay aligned across three places: the system prompt, the zod/serialize layer, and the Tina schema (`tina/config.ts`).

## The Next.js site

App Router under `src/app/`. Content is read from disk by `src/lib/posts.ts` — there is no database. Posts are MDX files in `content/posts/`, rendered with `next-mdx-remote`.

Two behaviors in `posts.ts` worth knowing:
- **Scheduled publishing:** a post with a future `date` frontmatter is hidden from every listing (home, categories, tags, feed, sitemap) until that time. An unparseable date is treated as published.
- **Related posts:** `relatedPosts()` ranks by shared tags → same category → recency, for the in-article "keep reading" block.

Other route notables: `app/api/cron/generate/route.ts` (auth via `Authorization: Bearer $CRON_SECRET` or `?secret=`, Node runtime, `maxDuration: 300`), `app/api/subscribe/route.ts` (newsletter signup), plus generated `sitemap.ts`, `robots.ts`, `feed.xml`, `ads.txt`.

## Scheduling & deploy

- **`.github/workflows/generate.yml`** is the hourly scheduler (`cron: '0 * * * *'` + manual `workflow_dispatch`). It runs `npx tsx scripts/run-local.ts`, then commits and pushes `content/`. Scheduling lives in Actions (not Vercel cron) to stay on free tiers — Vercel Hobby caps cron at once/day.
- **`.github/workflows/newsletter.yml`** sends the weekly digest (Mondays 14:00 UTC).
- The push step **rebases-and-retries** (5 attempts) so concurrent/re-run pushes to a moved ref don't fail. `content/.topic-log.json` uses a custom **union merge driver** (`scripts/merge-topic-log.mjs`, registered via `.gitattributes`) so concurrent appends auto-merge instead of conflicting.
- Optional `VERCEL_DEPLOY_HOOK_URL` fires a production redeploy after a successful push to the production branch; otherwise Vercel's git auto-deploy handles it.

## Conventions & gotchas

- **`src/site.config.ts` is the single source of truth** for niche, branding, sources, LLM provider/model/key-env, and image provider. To re-niche or retarget the engine, change this file (env vars `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_ADSENSE_CLIENT` can override per-deploy). Avoid hardcoding niche/branding elsewhere.
- **The LLM env var name is indirected** through `site.config.ts`'s `llm.apiKeyEnv` — `generate.ts` reads `process.env[that name]`. If you switch providers, update both the config and the secret name (the Action passes `GROQ_API_KEY`/`GEMINI_API_KEY`/`OPENROUTER_API_KEY` through).
- **Adding a source:** create `src/lib/sources/<name>.ts` exporting a fetcher that returns `RawItem[]`, add the new `source` literal to the union in `types.ts`, give it a weight in `SOURCE_WEIGHT` in `score.ts`, and add it to the `Promise.all` in `pipeline.ts`.
- **TinaCMS runs self-hosted (local filesystem) by default** — no cloud creds needed. `scripts/build.sh` skips the Tina cloud build when `NEXT_PUBLIC_TINA_CLIENT_ID`/`TINA_TOKEN` are unset. Path: `aliases`/import use `@/` → `src/` (see `tsconfig.json`).
- **Graceful-degradation is the norm:** sources, scraping, syndication, and the newsletter are all best-effort and must never throw fatally into the pipeline. Preserve this when editing — wrap new I/O accordingly.
- **Styling:** Tailwind; the editorial post styles live in `globals.css` under `.prose-editorial`.
