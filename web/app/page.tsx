import { SiteHeader } from '../components/SiteHeader';
import { SiteYearSelect } from '../components/SiteYearSelect';
import { StarryBackground } from '../components/StarryBackground';
import { getCatalog, type CatalogResponse, type PearlCatalogItem } from '../lib/pearls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HomePageProps = {
  searchParams: Promise<{
    authorSlug?: string | string[];
    documentType?: string | string[];
    q?: string | string[];
    siteYear?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selectedAuthorSlug = getFirstString(params.authorSlug);
  const selectedDocumentType = getFirstString(params.documentType);
  const selectedQuery = getFirstString(params.q);
  const selectedSiteYear = toPositiveInteger(getFirstString(params.siteYear));
  const catalog = await loadCatalog({
    authorSlug: selectedAuthorSlug,
    documentType: selectedDocumentType,
    q: selectedQuery,
    siteYear: selectedSiteYear,
  });
  const hiddenSearchFilters = [
    selectedAuthorSlug ? { name: 'authorSlug', value: selectedAuthorSlug } : null,
    selectedDocumentType ? { name: 'documentType', value: selectedDocumentType } : null,
    selectedSiteYear ? { name: 'siteYear', value: String(selectedSiteYear) } : null,
  ].filter((filter): filter is { name: string; value: string } => Boolean(filter));
  const hiddenYearFilters = [
    selectedAuthorSlug ? { name: 'authorSlug', value: selectedAuthorSlug } : null,
    selectedDocumentType ? { name: 'documentType', value: selectedDocumentType } : null,
    selectedQuery ? { name: 'q', value: selectedQuery } : null,
  ].filter((filter): filter is { name: string; value: string } => Boolean(filter));
  const searchResetHref = toRootHref(hiddenSearchFilters);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0118] text-violet-50">
      <StarryBackground />
      <div className="relative z-10">
        <SiteHeader hiddenFilters={hiddenSearchFilters} searchQuery={selectedQuery} searchResetHref={searchResetHref} />
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <SiteYearSelect hiddenFilters={hiddenYearFilters} selectedSiteYear={selectedSiteYear} yearLinks={catalog.yearLinks} />
            {catalog.filters.hasActive ? (
              <nav className="contents" aria-label="Активные фильтры">
              {catalog.filters.active.map((filter, index) => (
                <a
                  className={`group inline-flex items-center gap-2 rounded-full border border-pink-400/50 bg-pink-900/60 py-1 pl-3 pr-1 text-sm text-pink-100 transition-colors hover:bg-pink-900/80 ${
                    index === 0 ? 'ml-auto' : ''
                  }`}
                  href={filter.href}
                  key={filter.href}
                >
                  <span>{filter.label}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-pink-400/40 bg-pink-400/20 text-xs text-pink-200 transition-colors group-hover:bg-pink-400/60">
                    x
                  </span>
                </a>
              ))}
              </nav>
            ) : null}
          </div>

          {catalog.error ? (
            <div className="mb-8 rounded-2xl border-2 border-pink-400/50 bg-pink-950/50 p-6 text-pink-100 shadow-xl shadow-pink-500/20">
              <h2 className="mb-2 text-lg font-semibold">Backend API пока недоступен</h2>
              <p className="leading-7">
                Проверь <code className="rounded bg-black/30 px-2 py-1">DATABASE_URL</code> и доступность Postgres.
              </p>
              <p className="mt-3 text-sm text-pink-200/80">{catalog.error}</p>
            </div>
          ) : null}

          <div className="space-y-12">
            {catalog.documentGroups.length > 0 ? (
              catalog.documentGroups.map((yearGroup) => (
                <section aria-labelledby={`year-${yearGroup.year}`} key={yearGroup.year}>
                  <div className="mb-6 flex items-center gap-4">
                    <div className="h-1 w-10 rounded-full bg-linear-to-r from-cyan-500 to-pink-500 sm:w-16" />
                    <h1
                      className="bg-linear-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent drop-shadow-lg sm:text-4xl"
                      id={`year-${yearGroup.year}`}
                    >
                      {yearGroup.year}
                    </h1>
                    <div className="h-1 flex-1 rounded-full bg-linear-to-r from-pink-500 via-violet-500 to-cyan-500 opacity-50" />
                  </div>

                  <div className="hidden overflow-hidden rounded-2xl border-2 border-violet-400/40 bg-linear-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 shadow-2xl shadow-violet-500/20 sm:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] border-collapse">
                        <colgroup>
                          <col className="w-28" />
                          <col className="w-44" />
                          <col />
                          <col className="w-52" />
                        </colgroup>
                        <thead>
                          <tr className="border-b-2 border-violet-400/40 bg-linear-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80">
                            <th className="border-r-2 border-violet-400/40 px-4 py-3 text-left text-sm font-semibold text-cyan-200" scope="col">
                              Месяц
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-violet-200" scope="col">
                              Тип / Автор
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-pink-200" scope="col">
                              Название
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-200" scope="col">
                              Действия
                            </th>
                          </tr>
                        </thead>
                        {yearGroup.months.flatMap((monthGroup) => (
                          monthGroup.documents.map((document) => <PearlRows item={document} key={document.path} />)
                        ))}
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3 sm:hidden">
                    {yearGroup.months.flatMap((monthGroup) => (
                      monthGroup.documents.map((document) => <MobilePearlCard item={document} key={document.path} />)
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <p className="rounded-2xl border border-violet-400/40 bg-indigo-950/50 p-6 text-violet-100">
                По выбранному году документы не найдены.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PearlRows({ item }: { item: PearlCatalogItem }) {
  const documents = item.documents.length > 0 ? item.documents : [];

  if (documents.length === 0) {
    return (
      <tbody className="catalog-pearl-group">
        <tr className="border-t-2 border-violet-400/60 transition-colors">
          <td className="border-r-2 border-violet-400/40 px-4 py-1 align-middle font-semibold text-violet-100">
            <a className="transition-colors hover:text-cyan-100" href={item.path}>
              {toMonthLabel(item)}
            </a>
          </td>
          <td className="px-4 py-1 align-middle transition-colors">
            <span className="my-1 block text-xs uppercase leading-none tracking-wide text-violet-400">Материал</span>
          </td>
          <td className="px-4 py-1 text-center align-middle transition-colors">
            <a className="text-pink-100 transition-colors hover:text-pink-50" href={item.path}>
              {item.description}
            </a>
          </td>
          <td className="px-4 py-1 align-middle transition-colors">
            <DownloadLinks item={item} />
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="catalog-pearl-group">
      {documents.map((document, index) => (
        <tr
          className={`transition-colors ${
            index === 0 ? 'border-t-2 border-violet-400/60' : 'border-t border-violet-400/30'
          }`}
          key={`${item.path}-${index}`}
        >
          {index === 0 ? (
            <td
              className="border-r-2 border-violet-400/40 px-4 py-1 align-middle font-semibold text-violet-100"
              rowSpan={documents.length}
            >
              <a className="transition-colors hover:text-cyan-100" href={item.path}>
                {toMonthLabel(item)}
              </a>
            </td>
          ) : null}
          <td className="px-4 py-1 align-middle transition-colors">
            <MaterialMeta document={document} />
          </td>
          <td className="px-4 py-1 text-center align-middle transition-colors">
            <MaterialTitle document={document} itemPath={item.path} />
          </td>
          {index === 0 ? (
            <td className="px-4 py-1 align-middle transition-colors" rowSpan={documents.length}>
              <DownloadLinks item={item} />
            </td>
          ) : null}
        </tr>
      ))}
    </tbody>
  );
}

function MobilePearlCard({ item }: { item: PearlCatalogItem }) {
  const documents = item.documents.length > 0 ? item.documents : [];
  const label = documents.length === 1 ? 'материал' : 'материала';

  if (documents.length === 0) {
    return (
      <article className="relative overflow-hidden rounded-xl border border-violet-400/40 bg-linear-to-br from-indigo-950/70 via-purple-950/70 to-pink-950/70 transition-transform active:scale-[0.99]">
        <a aria-label={`Открыть ${item.description}`} className="absolute inset-0 z-0" href={item.path} />
        <CardHeader item={item} label="материал" />
        <div className="pointer-events-none relative z-10 px-4 py-3">
          <span className="text-xs uppercase text-violet-400">Материал</span>
          <a className="pointer-events-auto relative z-10 mt-0.5 block leading-snug text-pink-100" href={item.path}>
            {item.description}
          </a>
          <MobileDownloadLinks item={item} />
        </div>
      </article>
    );
  }

  return (
    <article className="relative overflow-hidden rounded-xl border border-violet-400/40 bg-linear-to-br from-indigo-950/70 via-purple-950/70 to-pink-950/70 transition-transform active:scale-[0.99]">
      <a aria-label={`Открыть ${item.description}`} className="absolute inset-0 z-0" href={item.path} />
      <CardHeader item={item} label={`${documents.length} ${label}`} />
      <div className="divide-y divide-violet-400/20">
        {documents.map((document, index) => (
          <div className="pointer-events-none relative z-10 px-4 py-3" key={`${item.path}-mobile-${index}`}>
            <a className="pointer-events-auto relative z-10 mb-1 block text-center text-base leading-snug text-pink-100 transition-colors hover:text-pink-50" href={item.path}>
              {document.title ? `«${document.title}»` : document.rawHeader}
            </a>
            <span className="block w-fit text-xs uppercase text-violet-400">
              {document.documentTypeLabel}
            </span>
            {document.author ? (
              document.authorFilterHref ? (
                <a className="pointer-events-auto relative z-10 inline-block max-w-full truncate text-sm text-cyan-300 transition-colors hover:text-cyan-100" href={document.authorFilterHref}>
                  {document.author}
                </a>
              ) : (
                <span className="inline-block max-w-full truncate text-sm text-cyan-300">{document.author}</span>
              )
            ) : null}
            {document.partTitle ? <span className="mt-1 block text-sm text-violet-300">{document.partTitle}</span> : null}
          </div>
        ))}
      </div>
      <div className="relative z-10 border-t border-violet-400/30 px-4 py-3">
        <MobileDownloadLinks item={item} />
      </div>
    </article>
  );
}

function CardHeader({ item, label }: { item: PearlCatalogItem; label: string }) {
  return (
    <div className="pointer-events-none relative z-10 flex items-center justify-between border-b border-violet-400/30 bg-indigo-900/60 px-4 py-2">
      <span className="text-sm font-semibold text-violet-200">
        {toMonthLabel(item)} {item.siteYear}
      </span>
      <span className="text-xs text-violet-400">{label}</span>
    </div>
  );
}

function MaterialMeta({ document }: { document: PearlCatalogItem['documents'][number] }) {
  return (
    <>
      <a
        className="my-1 block w-fit cursor-pointer whitespace-nowrap text-xs uppercase leading-none text-violet-400 transition-colors hover:text-pink-300"
        href={document.documentTypeFilterHref}
      >
        {document.documentTypeLabel}
      </a>
      {document.author ? (
        document.authorFilterHref ? (
          <a className="inline-block w-fit cursor-pointer whitespace-nowrap leading-snug text-cyan-200 transition-colors hover:text-cyan-100" href={document.authorFilterHref}>
            {document.author}
          </a>
        ) : (
          <span className="block whitespace-nowrap leading-snug text-cyan-200">{document.author}</span>
        )
      ) : null}
    </>
  );
}

function MaterialTitle({ document, itemPath }: { document: PearlCatalogItem['documents'][number]; itemPath: string }) {
  return (
    <div className="grid gap-0.5">
      <a className="text-[19px] leading-snug text-pink-100 transition-colors hover:text-pink-50" href={itemPath}>
        {document.title ? `«${document.title}»` : document.rawHeader}
      </a>
      {document.partTitle ? <span className="text-sm text-violet-300">{document.partTitle}</span> : null}
    </div>
  );
}

function DownloadLinks({ item }: { item: PearlCatalogItem }) {
  return (
    <div className="mx-auto grid w-fit grid-cols-2 gap-1.5">
      <a className="flex h-8 w-20 items-center justify-center gap-1 rounded bg-[#0d9e6e] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.path}>
        <BookOpenIcon />
        Читать
      </a>
      <a className="flex h-8 w-20 items-center justify-center gap-1 rounded bg-[#9b1b30] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.pdf}>
        <DownloadIcon className="h-3 w-3" />
        PDF
      </a>
      <a className="flex h-8 w-20 items-center justify-center gap-1 rounded bg-[#2b579a] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.docx}>
        <DownloadIcon className="h-3 w-3" />
        DOCX
      </a>
      <a className="flex h-8 w-20 items-center justify-center gap-1 rounded bg-[#5a9e30] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.epub}>
        <DownloadIcon className="h-3 w-3" />
        EPUB
      </a>
    </div>
  );
}

function MobileDownloadLinks({ item }: { item: PearlCatalogItem }) {
  return (
    <div className="pointer-events-auto relative z-10 grid grid-cols-2 gap-2">
      <a className="flex items-center justify-center gap-1 rounded bg-[#0d9e6e] py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.path}>
        <BookOpenIcon />
        Читать
      </a>
      <a className="flex items-center justify-center gap-1 rounded bg-[#9b1b30] py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.pdf}>
        <DownloadIcon className="h-3 w-3" />
        PDF
      </a>
      <a className="flex items-center justify-center gap-1 rounded bg-[#2b579a] py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.docx}>
        <DownloadIcon className="h-3 w-3" />
        DOCX
      </a>
      <a className="flex items-center justify-center gap-1 rounded bg-[#5a9e30] py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90" href={item.downloads.epub}>
        <DownloadIcon className="h-3 w-3" />
        EPUB
      </a>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3z" />
      <path d="M21 18a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3z" />
    </svg>
  );
}

function DownloadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function getFirstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toPositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function toMonthLabel(item: PearlCatalogItem): string {
  return item.siteMonth ? item.siteMonthLabel.replace(` ${item.siteYear}`, '') : item.siteMonthLabel;
}

function toRootHref(filters: { name: string; value: string }[]): string {
  const params = new URLSearchParams();

  for (const filter of filters) {
    params.set(filter.name, filter.value);
  }

  const query = params.toString();

  return query ? `/?${query}` : '/';
}

async function loadCatalog(filters: { authorSlug: string | null; documentType: string | null; q: string | null; siteYear: number | null }): Promise<CatalogResponse> {
  try {
    return await getCatalog(filters);
  } catch (error) {
    return {
      documentGroups: [],
      yearLinks: [],
      filters: {
        active: [],
        hasActive: false,
        resetSiteYearHref: '/',
      },
      error: error instanceof Error ? error.message : 'Unknown catalog loading error',
    };
  }
}
