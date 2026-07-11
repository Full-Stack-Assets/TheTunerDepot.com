import Link from 'next/link';
import { listPosts } from '@/lib/posts';
import { siteConfig } from '@/site.config';

export const revalidate = 300; // re-check content every 5 minutes

export default async function HomePage() {
  const posts = await listPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
      <Hero />

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {lead && <LeadStory post={lead} />}
          {rest.length > 0 && (
            <div className="mt-20">
              <SectionRule label="Fresh off the lift" />
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Hero() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  // Split the tagline on its separators so each segment reads like a gauge label.
  const taglineParts = siteConfig.tagline.split(/\s*[·|•]\s*/).filter(Boolean);
  return (
    <div className="relative mb-16 overflow-hidden border border-rule bg-carbon/50 px-6 py-12 sm:px-10 sm:py-16">
      <div className="stripe-signal absolute inset-x-0 top-0 h-1" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rotate-45 bg-accent/[0.06]"
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
        {taglineParts.map((part, i) => (
          <span key={part} className="flex items-center gap-4">
            {i > 0 && <span className="h-3 w-px bg-accent/40" aria-hidden />}
            {part}
          </span>
        ))}
      </div>
      <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
        Redline<br /><span className="text-accent">every hour.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {siteConfig.description}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="gauge-ticks w-40" aria-hidden />
        <div className="text-xs uppercase tracking-widest text-muted">{today}</div>
      </div>
    </div>
  );
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-[2px] w-10 bg-accent" />
      <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-ink">{label}</span>
      <div className="h-px flex-1 bg-rule" />
    </div>
  );
}

function LeadStory({ post }: { post: Awaited<ReturnType<typeof listPosts>>[number] }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="group grid gap-8 overflow-hidden border border-rule bg-carbon/40 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_20px_60px_-20px_rgba(255,91,31,0.25)] sm:grid-cols-5">
      {frontmatter.hero?.url && (
        <div className="aspect-[4/3] overflow-hidden bg-ink/5 sm:col-span-3">
          <Link href={`/blog/${slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frontmatter.hero.url}
              alt={frontmatter.hero.alt}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </Link>
        </div>
      )}
      <div className="flex flex-col justify-center p-6 sm:col-span-2 sm:py-8 sm:pl-0 sm:pr-8">
        <Link href={`/categories/${frontmatter.category}`} className="mb-3 inline-block self-start border border-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-paper">
          {frontmatter.category}
        </Link>
        <Link href={`/blog/${slug}`}>
          <h2 className="font-display text-3xl font-black uppercase leading-[1.02] tracking-tight transition-colors group-hover:text-accent sm:text-4xl">
            {frontmatter.title}
          </h2>
        </Link>
        <p className="mt-4 text-lg leading-relaxed text-muted">{frontmatter.description}</p>
        <div className="mt-5 text-xs uppercase tracking-widest text-muted">
          {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' · '} {readingTimeMin} min read
        </div>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: Awaited<ReturnType<typeof listPosts>>[number] }) {
  const { slug, frontmatter, readingTimeMin } = post;
  return (
    <article className="group flex flex-col overflow-hidden border border-rule bg-carbon/40 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_16px_40px_-16px_rgba(255,91,31,0.3)]">
      {frontmatter.hero?.url && (
        <Link href={`/blog/${slug}`} className="block aspect-[16/10] overflow-hidden bg-ink/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frontmatter.hero.url}
            alt={frontmatter.hero.alt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          {frontmatter.category}
        </div>
        <Link href={`/blog/${slug}`}>
          <h3 className="font-display text-xl font-bold leading-tight transition-colors group-hover:text-accent">
            {frontmatter.title}
          </h3>
        </Link>
        <p className="mt-2 text-sm text-muted line-clamp-2">{frontmatter.description}</p>
        <div className="mt-auto pt-3 text-[11px] uppercase tracking-widest text-muted/80">
          {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' · '} {readingTimeMin} min
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-rule py-24 text-center">
      <div className="font-display text-3xl font-bold uppercase">Nothing in the garage yet.</div>
      <p className="mt-3 text-muted">
        Run <code className="rounded bg-ink/10 px-2 py-0.5 text-sm">npm run generate</code> or wait for the next cron tick.
      </p>
    </div>
  );
}
