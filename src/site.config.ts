export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  name: 'The Tuner Depot',
  tagline: 'Builds · Performance · Culture',
  description: 'Car culture on the hour: tuning, builds, performance, EVs, and the news moving the automotive world.',
  url: 'https://thetunerdepot.com',
  footerNote: 'fresh car culture every hour, pulled from across the web.',

  // ── Audience & taxonomy ───────────────────────────────────────
  audience: 'car enthusiasts, tuners, and gearheads',
  categories: ['news', 'builds', 'performance', 'evs', 'reviews', 'culture'],
  navCategories: ['builds', 'performance', 'reviews'],

  // ── Niche sources ─────────────────────────────────────────────
  sources: {
    subreddits: ['cars', 'Autos', 'projectcar', 'JDM', 'electricvehicles', 'MechanicAdvice'],
    rssFeeds: [
      'https://www.motor1.com/rss/news/all/',
      'https://www.caranddriver.com/rss/all.xml/',
      'https://jalopnik.com/rss',
      'https://www.thedrive.com/feed',
      'https://www.carscoops.com/feed/',
    ],
    braveQueries: [
      'new sports car release',
      'car tuning build',
      'aftermarket performance parts',
      'electric vehicle performance',
      'motorsport news',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: writer LLM (Google Gemini, OpenAI-compatible) ─────
  llm: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-flash-latest',
    apiKeyEnv: 'GEMINI_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
