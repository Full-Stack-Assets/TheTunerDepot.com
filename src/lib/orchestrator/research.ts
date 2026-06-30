import * as cheerio from 'cheerio';
import { Innertube } from 'youtubei.js';
import type { ScoredItem, ResearchBundle, RawItem } from './types';
import { siteConfig } from '@/site.config';

const SCRAPER_UA = `Mozilla/5.0 (compatible; ${siteConfig.name.replace(/\s+/g, '')}/1.0; +${siteConfig.url})`;
const MIN_ARTICLE_CHARS = 120;
const MIN_SNIPPET_CHARS = 80;
const SCRAPE_CANDIDATE_LIMIT = 8;
const TARGET_ARTICLE_COUNT = 3;

interface BraveWebResult {
  url: string;
  title: string;
  description: string;
}

interface ResearchArticle {
  url: string;
  title: string;
  content: string;
}

async function braveWebSearch(query: string): Promise<BraveWebResult[]> {
  const key = process.env.BRAVE_API_KEY?.trim();
  if (!key) {
    console.warn('[research] BRAVE_API_KEY not set — web search unavailable');
    return [];
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '10');

  const res = await fetch(url, {
    headers: { 'x-subscription-token': key, accept: 'application/json' },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.warn(
      `[research] Brave web search failed (${res.status}) for "${query}": ${detail.slice(0, 200)}`
    );
    return [];
  }
  const json = (await res.json()) as { web?: { results?: BraveWebResult[] } };
  return json.web?.results ?? [];
}

async function scrapeArticle(url: string): Promise<{ title: string; content: string } | null> {
  if (!url.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': SCRAPER_UA,
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, aside, iframe, .advertisement, .ad, [role=navigation]').remove();

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('title').text() ??
      '';
    const metaDesc =
      $('meta[property="og:description"]').attr('content') ??
      $('meta[name="description"]').attr('content') ??
      '';

    const paragraphs: string[] = [];
    const container = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    container.find('p, h2, h3, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) paragraphs.push(text);
    });

    let content = paragraphs.join('\n\n').slice(0, 6000).trim();
    if (content.length < MIN_ARTICLE_CHARS && metaDesc.trim().length >= MIN_ARTICLE_CHARS) {
      content = metaDesc.trim();
    } else if (metaDesc.trim().length >= 40 && !content.includes(metaDesc.trim().slice(0, 40))) {
      content = `${metaDesc.trim()}\n\n${content}`.slice(0, 6000).trim();
    }

    if (content.length < MIN_ARTICLE_CHARS) return null;
    return { title: title.trim(), content };
  } catch {
    return null;
  }
}

function articleFromSnippet(result: BraveWebResult): ResearchArticle | null {
  const content = (result.description ?? '').trim();
  if (content.length < MIN_SNIPPET_CHARS) return null;
  return { url: result.url, title: result.title, content };
}

async function articleFromResult(result: BraveWebResult): Promise<ResearchArticle | null> {
  const scraped = await scrapeArticle(result.url);
  if (scraped) {
    return { url: result.url, title: scraped.title || result.title, content: scraped.content };
  }
  return articleFromSnippet(result);
}

async function fetchTranscript(videoId: string): Promise<{ title: string; text: string } | null> {
  try {
    const yt = await Innertube.create({ retrieve_player: false });
    const info = await yt.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    const text = transcriptData.transcript.content?.body?.initial_segments
      ?.map((s) => s.snippet.text)
      .join(' ')
      .slice(0, 5000);
    if (!text) return null;
    return { title: info.basic_info.title ?? '', text };
  } catch {
    return null;
  }
}

function extractVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function buildSearchQuery(title: string): string {
  return title.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).slice(0, 12).join(' ');
}

function uniqueSearchCandidates(results: BraveWebResult[], winnerHost: string): BraveWebResult[] {
  const seenHosts = new Set<string>(winnerHost ? [winnerHost] : []);
  const out: BraveWebResult[] = [];

  for (const result of results) {
    try {
      const host = new URL(result.url).hostname;
      if (seenHosts.has(host)) continue;
      seenHosts.add(host);
      out.push(result);
      if (out.length >= SCRAPE_CANDIDATE_LIMIT) break;
    } catch {
      // skip malformed URLs
    }
  }

  return out;
}

async function collectArticles(searchResults: BraveWebResult[], winnerHost: string): Promise<ResearchArticle[]> {
  const candidates = uniqueSearchCandidates(searchResults, winnerHost);
  const articles: ResearchArticle[] = [];

  for (const candidate of candidates) {
    if (articles.length >= TARGET_ARTICLE_COUNT) break;
    const article = await articleFromResult(candidate);
    if (article && !articles.some((a) => a.url === article.url)) {
      articles.push(article);
    }
  }

  // Last resort: Brave snippets often carry enough context for evergreen explainers
  // even when every target site blocks scraping (Reddit, forums, JS-heavy pages).
  if (articles.length === 0) {
    for (const candidate of searchResults) {
      const snippet = articleFromSnippet(candidate);
      if (snippet && !articles.some((a) => a.url === snippet.url)) {
        articles.push(snippet);
      }
      if (articles.length >= TARGET_ARTICLE_COUNT) break;
    }
  }

  return articles;
}

export async function research(
  winner: ScoredItem,
  allItems: RawItem[]
): Promise<ResearchBundle> {
  const query = buildSearchQuery(winner.title);
  let searchResults = await braveWebSearch(query);

  // Seed/evergreen topics are full sentences; a shorter retry helps when the
  // long query returns thin results.
  if (searchResults.length === 0 && query.split(/\s+/).length > 6) {
    const shortQuery = query.split(/\s+/).slice(0, 6).join(' ');
    console.warn(`[research] retrying Brave with shorter query: "${shortQuery}"`);
    searchResults = await braveWebSearch(shortQuery);
  }

  const winnerHost = (() => {
    try {
      return new URL(winner.url).hostname;
    } catch {
      return '';
    }
  })();

  const articles = await collectArticles(searchResults, winnerHost);

  if (winner.source !== 'youtube' && winner.url.trim()) {
    const winnerArticle = await scrapeArticle(winner.url);
    if (winnerArticle) {
      articles.unshift({
        url: winner.url,
        title: winnerArticle.title || winner.title,
        content: winnerArticle.content,
      });
    }
  }

  const videoIds = new Set<string>();
  if (winner.source === 'youtube') {
    const id = extractVideoId(winner.url);
    if (id) videoIds.add(id);
  }
  for (const it of allItems) {
    if (it.source !== 'youtube') continue;
    if (!it.title.toLowerCase().split(/\s+/).some((w) => query.toLowerCase().includes(w))) continue;
    const id = extractVideoId(it.url);
    if (id) videoIds.add(id);
    if (videoIds.size >= 2) break;
  }

  const transcripts = (
    await Promise.all(
      [...videoIds].map(async (id) => {
        const t = await fetchTranscript(id);
        return t ? { videoId: id, title: t.title, text: t.text } : null;
      })
    )
  ).filter((t): t is NonNullable<typeof t> => t !== null);

  const related = allItems
    .filter((it) => it.id !== winner.id)
    .filter((it) => {
      const a = new Set(it.title.toLowerCase().split(/\s+/));
      const b = new Set(winner.title.toLowerCase().split(/\s+/));
      let overlap = 0;
      for (const w of a) if (b.has(w) && w.length > 3) overlap++;
      return overlap >= 2;
    })
    .slice(0, 5);

  if (articles.length === 0 && transcripts.length === 0) {
    console.warn(
      `[research] no usable content for "${winner.title}" — ` +
        `Brave returned ${searchResults.length} result(s); check BRAVE_API_KEY quota and scrape targets.`
    );
  }

  return { winner, articles, transcripts, related };
}
