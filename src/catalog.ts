import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { prisma } from './db.js';
import type { Lecture } from './generated/prisma/client.js';
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
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export function getDocumentTypeLabel(documentType: DocumentType): string {
  return documentTypeLabels[documentType];
}

export async function loadPearlCatalog(rootDir: string, filters: CatalogFilters = {}): Promise<PearlCatalogItem[]> {
  const lectures = await prisma.lecture.findMany({
    where: {
      siteYear: filters.siteYear,
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

  return lectures.map((lecture) => toCatalogItem(rootDir, lecture, filters));
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

function toCatalogItem(rootDir: string, lecture: Lecture, filters: CatalogFilters): PearlCatalogItem {
  const year = String(lecture.siteYear);
  const path = `/pearls/${year}/${lecture.slug}`;
  const documentType = lecture.documentType as DocumentType;
  const jsonPath = resolve(rootDir, lecture.jsonPath);
  const body = toBody(lecture.content);

  return {
    slug: lecture.slug,
    year,
    siteYear: lecture.siteYear,
    siteMonth: lecture.siteMonth,
    siteMonthLabel: toSitePublicationLabel(lecture),
    path,
    jsonPath,
    sourcePath: resolve(rootDir, lecture.sourcePdf),
    sourceLabel: lecture.sourcePdf,
    title: lecture.title,
    subtitle: toSubtitle(lecture),
    description: lecture.description,
    body,
    containedDocuments: toContainedDocuments(lecture.containedDocs),
    author: lecture.authorName && lecture.authorSlug
      ? {
          label: lecture.authorName,
          href: buildCatalogFilterHref(filters, { author: lecture.authorSlug }),
        }
      : null,
    sitePublication: {
      label: String(lecture.siteYear),
      href: buildCatalogFilterHref(filters, { siteYear: lecture.siteYear }),
    },
    creation: lecture.creationYear
      ? {
          label: String(lecture.creationYear),
          href: buildCatalogFilterHref(filters, { creationYear: lecture.creationYear }),
        }
      : null,
    documentType: {
      label: getDocumentTypeLabel(documentType),
      href: buildCatalogFilterHref(filters, { documentType }),
    },
    pages: lecture.pages,
    paragraphs: lecture.paragraphsCount,
    layout: lecture.layout as PearlCatalogItem['layout'],
    downloads: {
      txt: `/downloads/${year}/${lecture.slug}.txt`,
      docx: `/downloads/${year}/${lecture.slug}.docx`,
      epub: `/downloads/${year}/${lecture.slug}.epub`,
    },
  };
}

function toSubtitle(lecture: Lecture): string {
  return [toSitePublicationLabel(lecture), lecture.documentTitle]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}

function toSitePublicationLabel(lecture: Lecture): string {
  if (!lecture.siteMonth) {
    return String(lecture.siteYear);
  }

  return `${monthNames[lecture.siteMonth - 1]} ${lecture.siteYear}`;
}

function toBody(content: string): Paragraph[] {
  return content.split(/\n{2,}/u).map((text) => ({ text })).filter((paragraph) => paragraph.text.trim().length > 0);
}

function toContainedDocuments(value: unknown): ContainedDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isContainedDocument);
}

function isContainedDocument(value: unknown): value is ContainedDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<ContainedDocument>;

  return (typeof item.author === 'string' || item.author === null)
    && (typeof item.title === 'string' || item.title === null)
    && typeof item.rawHeader === 'string';
}

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}
