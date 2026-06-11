import type { Metadata } from 'next';
import Script from 'next/script';

import { SiteHeader } from '../../../../components/SiteHeader';
import { StarryBackground } from '../../../../components/StarryBackground';
import { getPearl, type PearlDetail, type PearlInnerDocument } from '../../../../lib/pearls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PearlPageProps = {
  params: Promise<{
    year: string;
    slug: string;
  }>;
  searchParams: Promise<{
    print?: string | string[];
  }>;
};

type PearlLoadResult =
  | {
      document: PearlDetail;
      error: null;
    }
  | {
      document: null;
      error: string;
    };

const documentTypeLabels: Record<string, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  teaching: 'Учения',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export async function generateMetadata({ params }: PearlPageProps): Promise<Metadata> {
  const { year, slug } = await params;
  const result = await loadPearl(year, slug);

  if (!result.document) {
    return {
      title: 'Материал не найден — Жемчужины Мудрости',
    };
  }

  const description = result.document.documents
    .flatMap((document) => document.parts.body)
    .map((paragraph) => paragraph.text)
    .join(' ')
    .slice(0, 160);

  return {
    title: `${result.document.title} — Жемчужины Мудрости`,
    description,
  };
}

export default async function PearlPage({ params, searchParams }: PearlPageProps) {
  const { year, slug } = await params;
  const print = getFirstString((await searchParams).print) === '1';
  const result = await loadPearl(year, slug);
  const path = `/pearls/${year}/${slug}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0118] text-violet-50">
      <StarryBackground />
      <div className="relative z-10">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <BackToListLink className="mb-6" />

          {result.document ? (
            <>
              <article className="min-w-0 rounded-2xl border-2 border-violet-400/40 bg-linear-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 p-4 shadow-2xl shadow-violet-500/20 sm:p-8">
                <header className="mb-6 min-w-0 sm:mb-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400 sm:text-sm">
                    Жемчужины Мудрости
                  </p>
                  <h1 className="max-w-4xl wrap-break-word bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-3xl font-bold leading-tight text-transparent drop-shadow-lg sm:text-5xl">
                    {result.document.title}
                  </h1>
                  {result.document.sitePublication.label ? (
                    <p className="mt-3 text-base text-violet-300 sm:mt-4 sm:text-lg">{result.document.sitePublication.label}</p>
                  ) : null}

                  <DownloadActions path={path} slug={slug} year={year} />
                </header>

                <div className="grid min-w-0 gap-8 sm:gap-10">
                  {result.document.documents.map((innerDocument, index) => (
                    <InnerDocument document={innerDocument} pageTitle={result.document.title} key={`${innerDocument.documentTitle ?? 'document'}-${index}`} />
                  ))}
                </div>

                <footer className="mt-10 border-t border-violet-400/30 pt-6 text-sm text-violet-300">
                  Адрес страницы: <a className="text-cyan-200 hover:text-cyan-100" href={path}>{path}</a>
                </footer>
              </article>
              <BackToListLink className="mt-6" />
            </>
          ) : (
            <div className="rounded-2xl border-2 border-pink-400/50 bg-pink-950/50 p-6 text-pink-100 shadow-xl shadow-pink-500/20">
              <h1 className="mb-2 text-2xl font-semibold">Материал не удалось загрузить</h1>
              <p>{result.error}</p>
            </div>
          )}
        </section>
      </div>
      {print ? <AutoPrintScript /> : null}
    </main>
  );
}

function BackToListLink({ className }: { className: string }) {
  return (
    <a
      className={`${className} inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-indigo-900/60 px-4 py-2 text-violet-200 transition-all hover:border-violet-400/60 hover:bg-indigo-900/80`}
      href="/"
    >
      <span aria-hidden="true">←</span>
      Назад к списку
    </a>
  );
}

function DownloadActions({ path, slug, year }: { path: string; slug: string; year: string }) {
  return (
    <nav className="mt-6 border-y border-violet-400/30 py-3 sm:mt-8 sm:py-6" aria-label="Скачать материал">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="hidden text-lg font-semibold text-violet-200 sm:inline">Скачать:</span>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-violet-400/40 bg-violet-600/40 px-3 py-2 text-sm text-violet-100 transition-colors hover:bg-violet-600/60 sm:flex-none sm:gap-2 sm:px-4 sm:text-base" href={`/downloads/${year}/${slug}.txt`}>
          <DownloadIcon />
          TXT
        </a>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-400/40 bg-blue-600/40 px-3 py-2 text-sm text-blue-100 transition-colors hover:bg-blue-600/60 sm:flex-none sm:gap-2 sm:px-4 sm:text-base" href={`/downloads/${year}/${slug}.docx`}>
          <DownloadIcon />
          DOCX
        </a>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-pink-400/40 bg-pink-600/40 px-3 py-2 text-sm text-pink-100 transition-colors hover:bg-pink-600/60 sm:flex-none sm:gap-2 sm:px-4 sm:text-base" href={`/downloads/${year}/${slug}.epub`}>
          <DownloadIcon />
          EPUB
        </a>
        <a
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-600/40 px-3 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-600/60 sm:flex-none sm:gap-2 sm:px-4 sm:text-base"
          href={`${path}?print=1`}
          rel="noopener"
          target="_blank"
        >
          <PrinterIcon />
          <span className="hidden sm:inline">Печать</span>
        </a>
      </div>
    </nav>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
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

function PrinterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect height="8" rx="1" width="12" x="6" y="14" />
    </svg>
  );
}

function InnerDocument({ document, pageTitle }: { document: PearlInnerDocument; pageTitle: string }) {
  const displayHeader = document.parts.header.filter((line) => line !== pageTitle);

  return (
    <section className="min-w-0 border-t-2 border-violet-400/30 pt-6 first:border-t-0 first:pt-0 sm:pt-8">
      <header className="mb-5 min-w-0 sm:mb-6">
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-3">
          <span className="rounded-full border border-violet-400/40 bg-violet-600/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-200">
            {documentTypeLabels[document.documentType] ?? document.documentType}
          </span>
          {document.author.name ? <span className="min-w-0 wrap-break-word text-cyan-200">{document.author.name}</span> : null}
          {toCreationLabel(document) ? <span className="min-w-0 wrap-break-word text-violet-300">{toCreationLabel(document)}</span> : null}
        </div>
        {document.documentTitle ? (
          <h2 className="wrap-break-word bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl">
            «{document.documentTitle}»
          </h2>
        ) : null}
        {displayHeader.length > 0 ? (
          <div className="mt-4 grid min-w-0 gap-1 wrap-break-word text-sm text-violet-300">
            {displayHeader.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="min-w-0 rounded-xl border border-violet-400/25 bg-[#1a1228]/95 px-5 py-5 shadow-inner shadow-black/30 sm:px-10 sm:py-8">
        <div className="grid min-w-0 gap-5 wrap-break-word text-[1.05rem] leading-8 text-[#f0eaf8] sm:text-lg">
          {document.parts.body.map((paragraph, index) => (
            <p className="min-w-0 wrap-break-word" key={`${paragraph.text.slice(0, 42)}-${index}`}>{paragraph.text}</p>
          ))}
        </div>
      </div>

      {document.parts.footer.length > 0 ? (
        <footer className="mt-8 grid gap-3 border-t border-violet-400/30 pt-5 text-sm leading-6 text-violet-300">
          {document.parts.footer.map((paragraph, index) => (
            <p key={`${paragraph.text.slice(0, 42)}-${index}`}>{paragraph.text}</p>
          ))}
        </footer>
      ) : null}
    </section>
  );
}

function AutoPrintScript() {
  return (
    <Script id="auto-print" strategy="afterInteractive">
      {`(() => {
  const printPage = () => {
    window.focus();
    window.setTimeout(() => window.print(), 300);
  };

  if (document.readyState === 'complete') {
    printPage();
    return;
  }

  window.addEventListener('load', printPage, { once: true });
})();`}
    </Script>
  );
}

async function loadPearl(year: string, slug: string): Promise<PearlLoadResult> {
  try {
    const document = await getPearl(year, slug);

    if (!document) {
      return {
        document: null,
        error: 'Материал не найден в базе данных',
      };
    }

    return {
      document,
      error: null,
    };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : 'Unknown pearl loading error',
    };
  }
}

function getFirstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toCreationLabel(document: PearlInnerDocument): string | null {
  if (document.creation.raw) {
    return document.creation.raw;
  }

  if (document.creation.date) {
    return document.creation.date;
  }

  return document.creation.year ? String(document.creation.year) : null;
}
