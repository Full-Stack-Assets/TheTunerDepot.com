// Serves /ads.txt to authorize the AdSense seller at build time.
import { ADSENSE_CLIENT } from '@/lib/ads';

export const dynamic = 'force-static';

export function GET() {
  const publisherId = ADSENSE_CLIENT.replace(/^ca-/, '');
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
