import Parser from 'rss-parser';
import type { RawItem } from '../orchestrator/types';

// Google Trends' "Trending now" feed for the US. No API key needed.
const TRENDS_RSS = 'https://trends.google.com/trending/rss?geo=US';

// The raw feed is general-interest. Keep the blog on its car-culture niche by
// only surfacing trends whose term or related headlines match one of these.
const NICHE_KEYWORDS = [
  'car', 'cars', 'auto', 'automotive', 'vehicle', 'motor', 'motorsport', 'racing',
  'tuner', 'tuning', 'stance', 'stanced', 'slammed', 'lowered', 'camber', 'fitment',
  'jdm', 'drift', 'drifting', 'track day', 'trackday', 'nurburgring', 'formula',
  'nascar', 'f1', 'rally', 'rallycross', 'hot rod', 'muscle car', 'sports car',
  'supercar', 'hypercar', 'exhaust', 'turbo', 'supercharger', 'coilover', 'suspension',
  'widebody', 'engine swap', 'project car', 'aftermarket', 'mod', 'mods', 'build',
  'car meet', 'cars and coffee', 'detailing', 'wrap', 'vinyl wrap', 'restomod',
  'electric vehicle', 'ev ', 'tesla', 'rivian', 'lucid', 'porsche', 'bmw', 'audi',
  'mercedes', 'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'ford', 'chevy',
  'dodge', 'mustang', 'corvette', 'supra', 'gtr', '911', 'miata', 'civic',
  'brake', 'wheel', 'wheels', 'tire', 'tires', 'dyno', 'horsepower', 'torque',
];

type TrendItemFields = {
  'ht:approx_traffic'?: string;
  'ht:news_item'?: Array<Record<string, unknown>>;
};

const parser = new Parser<Record<string, unknown>, TrendItemFields>({
  timeout: 10_000,
  customFields: {
    item: [
      'ht:approx_traffic',
      ['ht:news_item', 'ht:news_item', { keepArray: true }],
    ],
  },
});

export async function fetchGoogleTrends(): Promise<RawItem[]> {
  try {
    return await parseTrendsXml(await fetchText(TRENDS_RSS));
  } catch (err) {
    console.warn('[googletrends] fetch/parse failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Parse a Google Trends RSS document into niche-filtered RawItems. */
export async function parseTrendsXml(xml: string): Promise<RawItem[]> {
  const feed = await parser.parseString(xml);
  return toRawItems(feed.items);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; WireAndLogicBot/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

type TrendItem = TrendItemFields & { title?: string; isoDate?: string; pubDate?: string };

/** Map parsed feed items to RawItems, dropping anything off the car-culture niche. */
export function toRawItems(items: TrendItem[]): RawItem[] {
  const out: RawItem[] = [];

  for (const entry of items) {
    const term = String(entry.title ?? '').trim();
    if (!term) continue;

    const news = entry['ht:news_item'] ?? [];
    const haystack = [
      term,
      ...news.map((n) => `${field(n, 'ht:news_item_title')} ${field(n, 'ht:news_item_source')}`),
    ]
      .join(' ')
      .toLowerCase();
    if (!NICHE_KEYWORDS.some((k) => haystack.includes(k))) continue;

    // Prefer a related news headline + URL so the research step has something
    // concrete to scrape; fall back to a Google search for the bare term.
    const top = news.find((n) => field(n, 'ht:news_item_url'));
    const title = (top && field(top, 'ht:news_item_title')) || term;
    const url =
      (top && field(top, 'ht:news_item_url')) ||
      `https://www.google.com/search?q=${encodeURIComponent(term)}`;

    out.push({
      id: `googletrends:${term}`,
      source: 'googletrends',
      title,
      url,
      publishedAt:
        String(entry.isoDate ?? entry.pubDate ?? '') || new Date().toISOString(),
      summary: `Trending search: ${term}`,
      upvotes: parseTraffic(entry['ht:approx_traffic']),
      comments: 0,
      tags: ['trending'],
    });
  }

  return out;
}

function field(obj: Record<string, unknown>, key: string): string {
  return String(obj[key] ?? '').trim();
}

/** "200,000+" / "200K+" / "2M+" → an approximate integer for scoring. */
export function parseTraffic(raw?: string): number {
  if (!raw) return 0;
  const m = raw.replace(/[,+\s]/g, '').match(/^([\d.]+)\s*([KMB]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = m[2].toUpperCase();
  const mult = unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1;
  return Math.round(n * mult);
}
