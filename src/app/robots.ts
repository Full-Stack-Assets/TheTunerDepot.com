import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/structured-data';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
