import type { MetadataRoute } from 'next';

import { getSitemapPaths } from '../lib/pearls';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const paths = await loadSitemapPaths();

  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}

async function loadSitemapPaths(): Promise<string[]> {
  try {
    return await getSitemapPaths();
  } catch {
    return ['/'];
  }
}

function getSiteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/u, '');
}
