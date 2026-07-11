import Link from 'next/link';
import { siteConfig } from '@/site.config';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 border-b-2 border-ink pb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">About</div>
        <h1 className="mt-2 font-display text-5xl font-black">How this works</h1>
      </div>

      <div className="prose-editorial">
        <p>
          <strong>{siteConfig.name}</strong> is an experiment in what happens when you point a small,
          opinionated pipeline at car culture — stanced builds, aftermarket performance, meets, and
          the news moving the automotive world — and let it write a fresh post every hour.
        </p>

        <h2>The pipeline</h2>
        <p>At the top of every hour, a scheduled job does five things:</p>
        <ol>
          <li><strong>Gather.</strong> Pulls headlines from car-culture subreddits, automotive RSS feeds, YouTube, Brave News, and Google Trends.</li>
          <li><strong>Score.</strong> Each candidate gets a composite score — popularity, engagement, recency — and anything already covered is filtered out.</li>
          <li><strong>Research.</strong> The winner gets Brave-searched, the top articles scraped, and any relevant YouTube transcripts pulled.</li>
          <li><strong>Write.</strong> All of it is handed to an LLM with an explicit MDX contract: an opening, a takeaway, what-happened/why-it-matters sections, a pros/cons block, a how-to-think-about-it section, and a three-question FAQ.</li>
          <li><strong>Publish.</strong> The MDX file, with a hero image and frontmatter, is committed to GitHub. Vercel notices and deploys.</li>
        </ol>

        <h2>The caveats</h2>
        <p>
          Automated writing has a quality floor, not a ceiling. The pipeline will occasionally pick
          a boring topic, miss nuance, or get a detail subtly wrong. Every post links its sources
          at the bottom — if something doesn&apos;t add up, go read the primaries.
        </p>

        <h2>The stack</h2>
        <p>
          Next.js, TinaCMS, Vercel, Groq, and a lot of free public APIs.
          Total running cost: $0/month at steady state.
        </p>

        <p className="mt-8">
          <Link href="/" className="text-accent underline">← Back to the front page</Link>
        </p>
      </div>
    </div>
  );
}
