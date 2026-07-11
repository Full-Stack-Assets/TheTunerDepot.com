export const siteConfig = {
  // ── Branding ──────────────────────────────────────────────────
  name: 'The Tuner Depot',
  tagline: 'Builds · Performance · Culture',
  description: 'Car culture on the hour: tuning, stanced builds, aftermarket performance, EVs, and the news moving the automotive world.',
  url: 'https://thetunerdepot.com',
  footerNote: 'fresh car culture every hour, pulled from across the web.',

  // ── Audience & taxonomy ───────────────────────────────────────
  audience: 'car enthusiasts, tuners, stance builders, and gearheads',
  categories: ['news', 'builds', 'performance', 'evs', 'reviews', 'culture'],
  navCategories: ['builds', 'performance', 'culture'],

  // ── Niche sources ─────────────────────────────────────────────
  sources: {
    subreddits: [
      'cars',
      'Autos',
      'projectcar',
      'JDM',
      'Stance',
      'stance',
      'loweredsociety',
      'Slammed',
      'carporn',
      'CarMeet',
      '240sx',
      'Miata',
      'FT86',
      'MechanicAdvice',
      'electricvehicles',
    ],
    rssFeeds: [
      'https://www.motor1.com/rss/news/all/',
      'https://www.caranddriver.com/rss/all.xml/',
      'https://jalopnik.com/rss',
      'https://www.thedrive.com/feed',
      'https://www.carscoops.com/feed/',
      'https://www.speedhunters.com/feed/',
      'https://www.superstreetonline.com/rss/all.xml/',
    ],
    braveQueries: [
      'stanced car build',
      'negative camber wheels fitment',
      'car meet this weekend',
      'aftermarket performance parts',
      'JDM tuning culture',
      'coilover suspension setup',
      'engine swap project car',
      'track day preparation tips',
      'widebody kit install',
      'electric vehicle performance tuning',
      'cars and coffee event',
      'bagged vs static stance',
    ],
  },

  // ── Ads ───────────────────────────────────────────────────────
  adsenseClient: 'ca-pub-4655488107179825',

  // ── Engine: writer LLM (Groq, OpenAI-compatible) ──────────────
  llm: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  // ── Engine: hero images ('pexels' | 'openverse' | 'none') ─────
  imageProvider: 'pexels',
} as const;

export type SiteConfig = typeof siteConfig;
export type ImageProvider = 'pexels' | 'openverse' | 'none';
