import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

function getSiteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/u, '');
}
