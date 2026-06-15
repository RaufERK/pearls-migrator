import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

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

export default async function PearlPage({ params }: PearlPageProps) {
  const { year, slug } = await params;
  const result = await loadPearl(year, slug);
  const path = `/pearls/${year}/${slug}`;

  if (!result.document) {
    permanentRedirect('/');
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#1a1228] text-violet-50 sm:bg-[#0a0118]">
      <div className="hidden sm:block">
        <StarryBackground />
      </div>
      <div className="relative z-10">
        <div className="hidden sm:block">
          <SiteHeader />
        </div>
        <section className="mx-auto max-w-5xl px-4 py-0 sm:px-6 sm:py-8 lg:px-8">
          <BackToListLink className="mb-6 hidden sm:inline-flex" />
          <MobileTopBar label={result.document.sitePublication.label ?? result.document.title} />

          <article className="min-w-0 sm:rounded-2xl sm:border-2 sm:border-violet-400/40 sm:bg-linear-to-br sm:from-indigo-950/60 sm:via-purple-950/60 sm:to-pink-950/60 sm:p-8 sm:shadow-2xl sm:shadow-violet-500/20">
            <header className="mb-6 min-w-0 sm:mb-8">
              <h1 className="hidden max-w-4xl wrap-break-word bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-5xl font-bold leading-tight text-transparent drop-shadow-lg sm:block">
                {result.document.title}
              </h1>
              {result.document.sitePublication.label ? (
                <p className="hidden text-violet-300 sm:mt-4 sm:block sm:text-lg">{result.document.sitePublication.label}</p>
              ) : null}

              <DownloadActions slug={slug} year={year} />
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
          <BackToListLink className="mt-8 inline-flex sm:mt-6" />
        </section>
      </div>
    </main>
  );
}

function BackToListLink({ className }: { className: string }) {
  return (
    <a
      className={`${className} items-center gap-2 rounded-lg border border-violet-400/40 bg-indigo-900/60 px-4 py-2 text-violet-200 transition-all hover:border-violet-400/60 hover:bg-indigo-900/80`}
      href="/"
    >
      <span aria-hidden="true">←</span>
      Назад к списку
    </a>
  );
}

function MobileTopBar({ label }: { label: string }) {
  return (
    <div className="-mx-4 mb-5 border-b border-violet-400/20 bg-[#120d1f] px-4 py-3 sm:hidden">
      <BackToListLink className="mb-3 inline-flex" />
      <div className="text-base font-semibold text-violet-200">{label}</div>
    </div>
  );
}

function DownloadActions({ slug, year }: { slug: string; year: string }) {
  return (
    <nav className="mt-5 border-b border-violet-400/20 pb-5 sm:mt-8 sm:border-y sm:border-violet-400/30 sm:py-4" aria-label="Скачать материал">
      <div className="flex gap-2 sm:flex-wrap sm:items-center">
        <span className="hidden text-xs uppercase tracking-wide text-violet-400 sm:inline">Скачать:</span>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#9b1b30] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm" href={`/downloads/${year}/${slug}.pdf`}>
          <DownloadIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          PDF
        </a>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#2b579a] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none sm:gap-2 sm:px-3 sm:text-sm" href={`/downloads/${year}/${slug}.docx`}>
          <DownloadIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          DOCX
        </a>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#5a9e30] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none sm:gap-2 sm:px-3 sm:text-sm" href={`/downloads/${year}/${slug}.epub`}>
          <DownloadIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          EPUB
        </a>
        <a className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#3a3a3a] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:flex-none sm:gap-2 sm:px-3 sm:text-sm" href={`/downloads/${year}/${slug}.txt`}>
          <DownloadIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          TXT
        </a>
      </div>
    </nav>
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

function InnerDocument({ document, pageTitle }: { document: PearlInnerDocument; pageTitle: string }) {
  const displayHeader = document.parts.header.filter((line) => line !== pageTitle && !line.startsWith('Жемчужины Мудрости'));

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
          <div className="mt-4 hidden min-w-0 gap-1 wrap-break-word text-sm text-violet-300 sm:grid">
            {displayHeader.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </header>

      <div className="min-w-0 py-2 sm:rounded-xl sm:border sm:border-violet-400/25 sm:bg-[#1a1228]/95 sm:px-10 sm:py-8 sm:shadow-inner sm:shadow-black/30">
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

function toCreationLabel(document: PearlInnerDocument): string | null {
  if (document.creation.raw) {
    return document.creation.raw;
  }

  if (document.creation.date) {
    return document.creation.date;
  }

  return document.creation.year ? String(document.creation.year) : null;
}
