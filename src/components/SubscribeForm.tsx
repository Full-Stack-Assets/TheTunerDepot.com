'use client';

export function SubscribeForm() {
  const subscribeUrl = process.env.NEXT_PUBLIC_NEWSLETTER_SUBSCRIBE_URL;

  if (!subscribeUrl) {
    return <p className="text-sm text-ink/60">Newsletter signup is being reconfigured.</p>;
  }

  return (
    <a
      href={subscribeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex border border-accent bg-accent px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-transparent hover:text-accent"
    >
      Subscribe to the newsletter
    </a>
  );
}
