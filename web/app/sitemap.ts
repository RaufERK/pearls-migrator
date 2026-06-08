import type { MetadataRoute } from 'next';

type PearlCatalogItem = {
  path: string;
};

type CatalogYearGroup = {
  months: {
    documents: PearlCatalogItem[];
  }[];
};

type CatalogResponse = {
  documentGroups: CatalogYearGroup[];
};

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const paths = await loadSitemapPaths();

  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}

async function loadSitemapPaths(): Promise<string[]> {
  const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${apiOrigin}/api/catalog`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return ['/'];
    }

    const catalog = await response.json() as CatalogResponse;
    const pearlPaths = catalog.documentGroups.flatMap((yearGroup) => (
      yearGroup.months.flatMap((monthGroup) => (
        monthGroup.documents.map((document) => document.path)
      ))
    ));

    return ['/', ...pearlPaths];
  } catch {
    return ['/'];
  }
}

function getSiteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/u, '');
}
