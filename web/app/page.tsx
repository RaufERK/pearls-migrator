import { HomeCatalog } from '../components/HomeCatalog';
import { SiteHeader } from '../components/SiteHeader';
import { StarryBackground } from '../components/StarryBackground';
import { getCatalog, type CatalogResponse } from '../lib/pearls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HomePageProps = {
  searchParams: Promise<{
    authorSlug?: string | string[];
    documentType?: string | string[];
    q?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selectedAuthorSlug = getFirstString(params.authorSlug);
  const selectedDocumentType = getFirstString(params.documentType);
  const selectedQuery = getFirstString(params.q);
  const catalog = await loadCatalog({
    authorSlug: selectedAuthorSlug,
    documentType: selectedDocumentType,
    q: selectedQuery,
  });
  const hiddenSearchFilters = [
    selectedAuthorSlug ? { name: 'authorSlug', value: selectedAuthorSlug } : null,
    selectedDocumentType ? { name: 'documentType', value: selectedDocumentType } : null,
  ].filter((filter): filter is { name: string; value: string } => Boolean(filter));
  const searchResetHref = toRootHref(hiddenSearchFilters);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0118] text-violet-50">
      <StarryBackground />
      <div className="relative z-10">
        <SiteHeader hiddenFilters={hiddenSearchFilters} searchQuery={selectedQuery} searchResetHref={searchResetHref} />
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <HomeCatalog
            documentGroups={catalog.documentGroups}
            error={catalog.error}
            filters={catalog.filters}
            yearLinks={catalog.yearLinks}
          />
        </section>
      </div>
    </main>
  );
}

function getFirstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toRootHref(filters: { name: string; value: string }[]): string {
  const params = new URLSearchParams();

  for (const filter of filters) {
    params.set(filter.name, filter.value);
  }

  const query = params.toString();

  return query ? `/?${query}` : '/';
}

async function loadCatalog(filters: { authorSlug: string | null; documentType: string | null; q: string | null }): Promise<CatalogResponse> {
  try {
    return await getCatalog(filters);
  } catch (error) {
    return {
      documentGroups: [],
      yearLinks: [],
      filters: {
        active: [],
        hasActive: false,
      },
      error: error instanceof Error ? error.message : 'Unknown catalog loading error',
    };
  }
}
