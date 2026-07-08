import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { prisma } from './db.js';
import type { Pearl, PearlDocument as PrismaPearlDocument } from './generated/prisma/client.js';
import { extractPartTitle, getDocumentTypeLabel, normalizeAuthorDisplayName, toBody, toSitePublicationLabel, toStringArray } from './catalogLabels.js';
import type { CatalogFilters, ContainedDocument, DocumentType, PearlCatalogItem, PearlDocument } from './types.js';

export { getDocumentTypeLabel };

type CatalogFilterHrefValue = string | number | null | undefined;

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
  const sourceLabel = pearl.sourceWord ?? pearl.sourcePdf;
  const sourceType = pearl.sourceWord ? 'word' : 'pdf';
  const sourceHref = `/source-files/${year}/${encodeURIComponent(basename(sourceLabel))}`;
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
    sourcePath: resolve(rootDir, sourceLabel),
    sourceLabel,
    sourceType,
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
    originalSource: {
      href: sourceHref,
      label: basename(sourceLabel),
    },
    downloads: {
      original: sourceHref,
      pdf: `/downloads/${year}/${pearl.slug}.pdf`,
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

function toCreationDateLabel(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return `${value.getUTCDate()} ${russianDateMonths[value.getUTCMonth()]} ${value.getUTCFullYear()} год`;
}

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}
