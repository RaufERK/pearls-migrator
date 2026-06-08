import type { Metadata } from 'next';
import Script from 'next/script';

import { SiteHeader } from '../../../../components/SiteHeader';
import { StarryBackground } from '../../../../components/StarryBackground';

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

type Paragraph = {
  text: string;
};

type PearlInnerDocument = {
  documentTitle: string | null;
  documentType: string;
  author: {
    name: string | null;
  };
  creation: {
    date: string | null;
    year: number | null;
    raw: string | null;
  };
  parts: {
    header: string[];
    body: Paragraph[];
    footer: Paragraph[];
  };
};

type PearlDocument = {
  slug: string;
  title: string;
  sitePublication: {
    label: string | null;
    year: number | null;
    month: number | null;
  };
  documents: PearlInnerDocument[];
  documentsCount: number;
};

type PearlLoadResult =
  | {
      document: PearlDocument;
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
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <a
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-indigo-900/60 px-4 py-2 font-sans text-violet-200 transition-all hover:border-violet-400/60 hover:bg-indigo-900/80"
            href="/"
          >
            <span aria-hidden="true">←</span>
            Назад к списку
          </a>

          {result.document ? (
            <article className="rounded-2xl border-2 border-violet-400/40 bg-linear-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 p-6 shadow-2xl shadow-violet-500/20 sm:p-8">
              <header className="mb-8">
                <p className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">
                  Жемчужины Мудрости
                </p>
                <h1 className="max-w-4xl bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-4xl font-bold leading-tight text-transparent drop-shadow-lg sm:text-5xl">
                  {result.document.title}
                </h1>
                {result.document.sitePublication.label ? (
                  <p className="mt-4 font-sans text-lg text-violet-300">{result.document.sitePublication.label}</p>
                ) : null}

                <DownloadActions path={path} slug={slug} year={year} />
              </header>

              <div className="grid gap-10">
                {result.document.documents.map((innerDocument, index) => (
                  <InnerDocument document={innerDocument} pageTitle={result.document.title} key={`${innerDocument.documentTitle ?? 'document'}-${index}`} />
                ))}
              </div>

              <footer className="mt-10 border-t border-violet-400/30 pt-6 font-sans text-sm text-violet-300">
                Адрес страницы: <a className="text-cyan-200 hover:text-cyan-100" href={path}>{path}</a>
              </footer>
            </article>
          ) : (
            <div className="rounded-2xl border-2 border-pink-400/50 bg-pink-950/50 p-6 font-sans text-pink-100 shadow-xl shadow-pink-500/20">
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

function DownloadActions({ path, slug, year }: { path: string; slug: string; year: string }) {
  return (
    <nav className="mt-8 border-y border-violet-400/30 py-6 font-sans" aria-label="Скачать материал">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold text-violet-200">Скачать:</span>
        <a className="rounded-lg border border-violet-400/40 bg-violet-600/40 px-4 py-2 text-violet-100 transition-colors hover:bg-violet-600/60" href={`/downloads/${year}/${slug}.txt`}>
          TXT
        </a>
        <a className="rounded-lg border border-blue-400/40 bg-blue-600/40 px-4 py-2 text-blue-100 transition-colors hover:bg-blue-600/60" href={`/downloads/${year}/${slug}.docx`}>
          DOCX
        </a>
        <a className="rounded-lg border border-pink-400/40 bg-pink-600/40 px-4 py-2 text-pink-100 transition-colors hover:bg-pink-600/60" href={`/downloads/${year}/${slug}.epub`}>
          EPUB
        </a>
        <a
          className="rounded-lg border border-cyan-400/40 bg-cyan-600/40 px-4 py-2 text-cyan-100 transition-colors hover:bg-cyan-600/60"
          href={`${path}?print=1`}
          rel="noopener"
          target="_blank"
        >
          Печать
        </a>
      </div>
    </nav>
  );
}

function InnerDocument({ document, pageTitle }: { document: PearlInnerDocument; pageTitle: string }) {
  const displayHeader = document.parts.header.filter((line) => line !== pageTitle);

  return (
    <section className="border-t-2 border-violet-400/30 pt-8 first:border-t-0 first:pt-0">
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-3 font-sans">
          <span className="rounded-full border border-violet-400/40 bg-violet-600/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-200">
            {documentTypeLabels[document.documentType] ?? document.documentType}
          </span>
          {document.author.name ? <span className="text-cyan-200">{document.author.name}</span> : null}
          {toCreationLabel(document) ? <span className="text-violet-300">{toCreationLabel(document)}</span> : null}
        </div>
        {document.documentTitle ? (
          <h2 className="bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-3xl font-bold leading-tight text-transparent">
            «{document.documentTitle}»
          </h2>
        ) : null}
        {displayHeader.length > 0 ? (
          <div className="mt-4 grid gap-1 font-sans text-sm text-violet-300">
            {displayHeader.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 text-lg leading-8 text-violet-100">
        {document.parts.body.map((paragraph, index) => (
          <p key={`${paragraph.text.slice(0, 42)}-${index}`}>{paragraph.text}</p>
        ))}
      </div>

      {document.parts.footer.length > 0 ? (
        <footer className="mt-8 grid gap-3 border-t border-violet-400/30 pt-5 font-sans text-sm leading-6 text-violet-300">
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
      {"window.addEventListener('load', () => { window.print(); });"}
    </Script>
  );
}

async function loadPearl(year: string, slug: string): Promise<PearlLoadResult> {
  const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${apiOrigin}/api/pearls/${year}/${slug}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        document: null,
        error: `Backend вернул ${response.status}`,
      };
    }

    return {
      document: await response.json() as PearlDocument,
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
