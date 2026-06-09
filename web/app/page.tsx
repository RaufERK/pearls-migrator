import { SiteHeader } from '../components/SiteHeader';
import { StarryBackground } from '../components/StarryBackground';
import { getCatalog, type CatalogResponse, type PearlCatalogItem } from '../lib/pearls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type HomePageProps = {
  searchParams: Promise<{
    siteYear?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const selectedSiteYear = toPositiveInteger(getFirstString((await searchParams).siteYear));
  const catalog = await loadCatalog(selectedSiteYear);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0118] text-violet-50">
      <StarryBackground />
      <div className="relative z-10">
        <SiteHeader />
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-6 flex flex-wrap gap-2 font-sans" aria-label="Фильтр по году публикации">
            <a
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedSiteYear
                  ? 'border-violet-400/40 bg-indigo-900/50 text-violet-100 hover:bg-indigo-900/70'
                  : 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
              }`}
              href="/"
            >
              Все годы
            </a>
            {catalog.yearLinks.map((link) => (
              <a
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  selectedSiteYear === Number(link.label)
                    ? 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
                    : 'border-violet-400/40 bg-indigo-900/50 text-violet-100 hover:bg-indigo-900/70'
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {catalog.filters.hasActive ? (
            <nav className="mb-8 flex flex-wrap items-center gap-2 font-sans" aria-label="Активные фильтры">
              <span className="text-sm font-semibold text-violet-200">Фильтр:</span>
              {catalog.filters.active.map((filter) => (
                <a
                  className="rounded-full border border-pink-400/40 bg-pink-600/40 px-3 py-1 text-sm text-pink-100 transition-colors hover:bg-pink-600/60"
                  href={filter.href}
                  key={filter.href}
                >
                  {filter.label} x
                </a>
              ))}
            </nav>
          ) : null}

          <div className="mb-8 flex items-center gap-4">
            <div className="h-1 w-16 rounded-full bg-linear-to-r from-cyan-500 to-pink-500" />
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Word-каталог с полными текстами и скачиваниями
            </p>
            <div className="h-1 flex-1 rounded-full bg-linear-to-r from-pink-500 via-violet-500 to-cyan-500 opacity-50" />
          </div>

          {catalog.error ? (
            <div className="mb-8 rounded-2xl border-2 border-pink-400/50 bg-pink-950/50 p-6 font-sans text-pink-100 shadow-xl shadow-pink-500/20">
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
                    <div className="h-1 w-16 rounded-full bg-linear-to-r from-cyan-500 to-pink-500" />
                    <h1
                      className="bg-linear-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-4xl font-bold text-transparent drop-shadow-lg"
                      id={`year-${yearGroup.year}`}
                    >
                      {yearGroup.year}
                    </h1>
                    <div className="h-1 flex-1 rounded-full bg-linear-to-r from-pink-500 via-violet-500 to-cyan-500 opacity-50" />
                  </div>

                  <div className="overflow-hidden rounded-2xl border-2 border-violet-400/40 bg-linear-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 shadow-2xl shadow-violet-500/20">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] table-fixed">
                        <colgroup>
                          <col className="w-40" />
                          <col />
                          <col className="w-56" />
                          <col className="w-64" />
                        </colgroup>
                        <thead>
                          <tr className="border-b-2 border-violet-400/40 bg-linear-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80">
                            <th className="border-r-2 border-violet-400/40 px-6 py-4 text-left font-sans text-sm font-semibold text-cyan-200" scope="col">
                              Месяц
                            </th>
                            <th className="px-6 py-4 text-left font-sans text-sm font-semibold text-violet-200" scope="col">
                              Материалы
                            </th>
                            <th className="px-6 py-4 text-left font-sans text-sm font-semibold text-pink-200" scope="col">
                              Дата создания
                            </th>
                            <th className="px-6 py-4 text-left font-sans text-sm font-semibold text-cyan-200" scope="col">
                              Скачать
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearGroup.months.flatMap((monthGroup) => (
                            monthGroup.documents.flatMap((document) => toPearlRows(document))
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))
            ) : (
              <p className="rounded-2xl border border-violet-400/40 bg-indigo-950/50 p-6 font-sans text-violet-100">
                По выбранному году документы не найдены.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function toPearlRows(item: PearlCatalogItem) {
  const documents = item.documents.length > 0 ? item.documents : [];

  if (documents.length === 0) {
    return [
      <tr className="border-t-2 border-violet-400/60 transition-colors hover:bg-linear-to-r hover:from-violet-500/10 hover:via-pink-500/10 hover:to-cyan-500/10" key={item.path}>
        <td className="border-r-2 border-violet-400/40 px-6 py-6 align-top font-sans font-semibold text-violet-100">
          <a className="transition-colors hover:text-cyan-100" href={item.path}>
            {toMonthLabel(item)}
          </a>
        </td>
        <td className="px-6 py-6 align-top">
          <a className="text-pink-100 transition-colors hover:text-pink-50" href={item.path}>
            {item.description}
          </a>
        </td>
        <td className="px-6 py-6 align-top font-sans text-sm text-violet-300">-</td>
        <td className="px-6 py-6 align-middle">
          <DownloadLinks item={item} />
        </td>
      </tr>,
    ];
  }

  return documents.map((document, index) => (
    <tr
      className={`transition-colors hover:bg-linear-to-r hover:from-violet-500/10 hover:via-pink-500/10 hover:to-cyan-500/10 ${
        index === 0 ? 'border-t-2 border-violet-400/60' : 'border-t border-violet-400/30'
      }`}
      key={`${item.path}-${index}`}
    >
      {index === 0 ? (
        <td
          className="border-r-2 border-violet-400/40 px-6 py-6 align-top font-sans font-semibold text-violet-100"
          rowSpan={documents.length}
        >
          <a className="transition-colors hover:text-cyan-100" href={item.path}>
            {toMonthLabel(item)}
          </a>
        </td>
      ) : null}
      <td className="px-6 py-6 align-top">
        <MaterialLink document={document} itemPath={item.path} />
      </td>
      <td className="px-6 py-6 align-top">
        <p className="font-sans text-sm text-violet-300">{document.creationLabel ?? '-'}</p>
      </td>
      {index === 0 ? (
        <td className="px-6 py-6 align-middle" rowSpan={documents.length}>
          <DownloadLinks item={item} />
        </td>
      ) : null}
    </tr>
  ));
}

function MaterialLink({ document, itemPath }: { document: PearlCatalogItem['documents'][number]; itemPath: string }) {
  return (
    <a className="grid gap-1 transition-colors hover:text-pink-50" href={itemPath}>
      {document.documentTypeLabel ? (
        <span className="font-sans text-xs uppercase tracking-wide text-violet-400">{document.documentTypeLabel}</span>
      ) : null}
      {document.author ? <span className="font-sans text-cyan-200">{document.author}</span> : null}
      {document.title ? (
        <span className="text-lg leading-snug text-pink-100">«{document.title}»</span>
      ) : (
        <span className="text-lg leading-snug text-pink-100">{document.rawHeader}</span>
      )}
      {document.partTitle ? <span className="font-sans text-sm text-violet-300">{document.partTitle}</span> : null}
    </a>
  );
}

function DownloadLinks({ item }: { item: PearlCatalogItem }) {
  return (
    <div className="mx-auto grid w-fit grid-cols-2 gap-2 font-sans">
      <a className="flex h-9 w-20 items-center justify-center rounded border border-violet-400/40 bg-violet-600/40 px-3 py-2 text-xs text-violet-100 transition-colors hover:bg-violet-600/60" href={item.downloads.txt}>
        TXT
      </a>
      <a className="flex h-9 w-20 items-center justify-center rounded border border-blue-400/40 bg-blue-600/40 px-3 py-2 text-xs text-blue-100 transition-colors hover:bg-blue-600/60" href={item.downloads.docx}>
        DOCX
      </a>
      <a className="flex h-9 w-20 items-center justify-center rounded border border-pink-400/40 bg-pink-600/40 px-3 py-2 text-xs text-pink-100 transition-colors hover:bg-pink-600/60" href={item.downloads.epub}>
        EPUB
      </a>
      <a
        aria-label={`Печатать ${item.siteMonthLabel}`}
        className="flex h-9 w-20 items-center justify-center rounded border border-cyan-400/40 bg-cyan-600/40 px-3 py-2 text-cyan-100 transition-colors hover:bg-cyan-600/60"
        href={`${item.path}?print=1`}
        rel="noopener"
        target="_blank"
        title="Печать"
      >
        ⎙
      </a>
    </div>
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

async function loadCatalog(siteYear: number | null): Promise<CatalogResponse> {
  try {
    return await getCatalog(siteYear);
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
