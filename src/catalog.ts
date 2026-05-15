import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { prisma } from './db.js';
import type { Pearl, PearlDocument as PrismaPearlDocument } from './generated/prisma/client.js';
import type { CatalogFilters, ContainedDocument, DocumentType, Paragraph, PearlCatalogItem, PearlDocument } from './types.js';

type CatalogFilterHrefValue = string | number | null | undefined;

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const documentTypeLabels: Record<DocumentType, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  teaching: 'Учения',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

const russianDateMonths = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function getDocumentTypeLabel(documentType: DocumentType): string {
  return documentTypeLabels[documentType];
}

export async function loadPearlCatalog(rootDir: string, filters: CatalogFilters = {}): Promise<PearlCatalogItem[]> {
  const documentFilters = {
    ...(filters.author ? { authorSlug: filters.author } : {}),
    ...(filters.creationYear ? { creationYear: filters.creationYear } : {}),
    ...(filters.documentType ? { documentType: filters.documentType } : {}),
  };
  const hasDocumentFilters = Object.keys(documentFilters).length > 0;
  const pearls = await prisma.pearl.findMany({
    where: {
      siteYear: filters.siteYear,
      ...(hasDocumentFilters
        ? {
            documents: {
              some: documentFilters,
            },
          }
        : {}),
    },
    include: {
      documents: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: [
      {
        siteSortDate: 'desc',
      },
      {
        slug: 'desc',
      },
    ],
  });

  return pearls.map((pearl) => toCatalogItem(rootDir, pearl, filters));
}

export function buildCatalogFilterHref(
  filters: CatalogFilters,
  overrides: Partial<Record<keyof CatalogFilters, CatalogFilterHrefValue>>,
): string {
  const params = new URLSearchParams();
  const nextFilters: Record<keyof CatalogFilters, CatalogFilterHrefValue> = {
    author: filters.author,
    siteYear: filters.siteYear,
    creationYear: filters.creationYear,
    documentType: filters.documentType,
    ...overrides,
  };

  for (const [key, value] of Object.entries(nextFilters)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();

  return query ? `/?${query}` : '/';
}

type PearlWithDocuments = Pearl & {
  documents: PrismaPearlDocument[];
};

function toCatalogItem(rootDir: string, pearl: PearlWithDocuments, filters: CatalogFilters): PearlCatalogItem {
  const year = String(pearl.siteYear);
  const path = `/pearls/${year}/${pearl.slug}`;
  const firstDocument = pearl.documents[0];
  const documentType = (firstDocument?.documentType ?? 'material') as DocumentType;
  const jsonPath = resolve(rootDir, pearl.jsonPath);
  const originalPdfHref = `/source-pdfs/${year}/${encodeURIComponent(basename(pearl.sourcePdf))}`;
  const body = pearl.documents.flatMap((document) => toBody(document.content));
  const containedDocuments = pearl.documents.map((document) => toContainedDocument(document, filters));

  return {
    slug: pearl.slug,
    year,
    siteYear: pearl.siteYear,
    siteMonth: pearl.siteMonth,
    siteMonthLabel: toSitePublicationLabel(pearl),
    path,
    jsonPath,
    sourcePath: resolve(rootDir, pearl.sourcePdf),
    sourceLabel: pearl.sourcePdf,
    title: pearl.title,
    documentsCount: pearl.documentsCount,
    documents: containedDocuments,
    singleDocument: containedDocuments.length === 1 ? containedDocuments[0] : null,
    description: firstDocument?.description ?? toSitePublicationLabel(pearl),
    body,
    author: firstDocument?.authorName && firstDocument.authorSlug
      ? {
          label: firstDocument.authorName,
          href: buildCatalogFilterHref(filters, { author: firstDocument.authorSlug }),
        }
      : null,
    sitePublication: {
      label: String(pearl.siteYear),
      href: buildCatalogFilterHref(filters, { siteYear: pearl.siteYear }),
    },
    creation: firstDocument?.creationYear
      ? {
          label: String(firstDocument.creationYear),
          href: buildCatalogFilterHref(filters, { creationYear: firstDocument.creationYear }),
        }
      : null,
    documentType: {
      label: getDocumentTypeLabel(documentType),
      href: buildCatalogFilterHref(filters, { documentType }),
    },
    pages: pearl.pages,
    paragraphs: pearl.documents.reduce((count, document) => count + document.paragraphsCount, 0),
    layout: pearl.layout as PearlCatalogItem['layout'],
    showOriginal: false,
    originalPdf: {
      href: originalPdfHref,
      label: basename(pearl.sourcePdf),
    },
    downloads: {
      pdf: originalPdfHref,
      txt: `/downloads/${year}/${pearl.slug}.txt`,
      docx: `/downloads/${year}/${pearl.slug}.docx`,
      epub: `/downloads/${year}/${pearl.slug}.epub`,
    },
  };
}

function toContainedDocument(document: PrismaPearlDocument, filters: CatalogFilters): ContainedDocument {
  const header = toStringArray(document.header);
  const partTitle = extractPartTitle(header);
  const documentType = document.documentType as DocumentType;
  const author = normalizeAuthorDisplayName(document.authorName);
  const creationLabel = toCreationDateLabel(document.creationDate) ?? (document.creationYear ? String(document.creationYear) : null);

  return {
    author,
    authorLink: author && document.authorSlug
      ? {
          label: author,
          href: buildCatalogFilterHref(filters, { author: document.authorSlug }),
        }
      : null,
    title: document.documentTitle,
    partTitle,
    creationLabel,
    creationDateLabel: toCreationDateLabel(document.creationDate),
    creationYear: document.creationYear,
    creationYearLink: document.creationYear
      ? {
          label: String(document.creationYear),
          href: buildCatalogFilterHref(filters, { creationYear: document.creationYear }),
        }
      : null,
    documentType,
    documentTypeLabel: getDocumentTypeLabel(documentType),
    documentTypeLink: {
      label: getDocumentTypeLabel(documentType),
      href: buildCatalogFilterHref(filters, { documentType }),
    },
    rawHeader: header.join(' · '),
  };
}

function toSitePublicationLabel(pearl: Pearl): string {
  if (pearl.siteLabel) {
    return pearl.siteLabel;
  }

  if (!pearl.siteMonth) {
    return String(pearl.siteYear);
  }

  return `${monthNames[pearl.siteMonth - 1]} ${pearl.siteYear}`;
}

function toBody(content: string): Paragraph[] {
  return content.split(/\n{2,}/u).map((text) => ({ text })).filter((paragraph) => paragraph.text.trim().length > 0);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function extractPartTitle(header: string[]): string | null {
  return header.find((line) => /^Часть\s+[IVXLCDM\d]+$/iu.test(line.trim())) ?? null;
}

function toCreationDateLabel(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return `${value.getUTCDate()} ${russianDateMonths[value.getUTCMonth()]} ${value.getUTCFullYear()} год`;
}

function normalizeAuthorDisplayName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/^Господа Майтрейи$/u, 'Господь Майтрейя')
    .replace(/^Архангела Михаила$/u, 'Архангел Михаил')
    .replace(/^возлюбленного Гелиоса$/u, 'Возлюбленный Гелиос')
    .replace(/^возлюбленный/u, 'Возлюбленный')
    .trim();

  return normalized.length > 0 ? normalized : null;
}

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}
