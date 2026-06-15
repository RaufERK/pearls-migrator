import type { Pearl, PearlDocument as PrismaPearlDocument } from '../generated/prisma/client';

import { prisma } from './prisma';

export type CatalogFilterLink = {
  label: string;
  href: string;
  value: string;
};

export type ContainedDocument = {
  author: string | null;
  authorFilterHref: string | null;
  title: string | null;
  partTitle?: string | null;
  documentType: string;
  documentTypeFilterHref: string;
  documentTypeLabel?: string;
  rawHeader: string;
};

export type PearlCatalogItem = {
  path: string;
  siteYear: number;
  siteMonth: number | null;
  siteMonthLabel: string;
  description: string;
  documents: ContainedDocument[];
  downloads: {
    pdf: string;
    txt: string;
    docx: string;
    epub: string;
  };
};

export type CatalogYearGroup = {
  year: string;
  months: {
    label: string;
    documents: PearlCatalogItem[];
  }[];
};

export type CatalogResponse = {
  documentGroups: CatalogYearGroup[];
  yearLinks: CatalogFilterLink[];
  filters: {
    active: CatalogFilterLink[];
    hasActive: boolean;
    resetSiteYearHref: string;
  };
  error?: string;
};

export type Paragraph = {
  text: string;
};

export type PearlInnerDocument = {
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

export type PearlDetail = {
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

type CatalogFilters = {
  authorSlug?: string;
  documentType?: string;
  q?: string;
  siteYear?: number;
};

type PearlWithDocuments = Pearl & {
  documents: PrismaPearlDocument[];
};

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

const documentTypeLabels: Record<string, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  teaching: 'Учения',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export async function getCatalog(rawFilters: { authorSlug?: string | null; documentType?: string | null; q?: string | null; siteYear?: number | null }): Promise<CatalogResponse> {
  const filters: CatalogFilters = {
    authorSlug: toOptionalFilter(rawFilters.authorSlug),
    documentType: toOptionalFilter(rawFilters.documentType),
    q: toOptionalFilter(rawFilters.q),
    siteYear: rawFilters.siteYear ?? undefined,
  };
  const documentWhere = toDocumentWhere(filters);
  const searchDocumentIds = filters.q ? await findMatchingDocumentIds(filters) : null;
  const filteredDocumentWhere = {
    ...documentWhere,
    ...(searchDocumentIds ? { id: { in: searchDocumentIds } } : {}),
  };
  const hasDocumentFilters = Object.keys(filteredDocumentWhere).length > 0;
  const [pearls, siteYears] = await Promise.all([
    prisma.pearl.findMany({
      where: {
        ...(hasDocumentFilters ? { documents: { some: filteredDocumentWhere } } : {}),
        siteYear: filters.siteYear,
      },
      include: {
        documents: {
          where: hasDocumentFilters ? filteredDocumentWhere : undefined,
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
    }),
    prisma.pearl.findMany({
      select: {
        siteYear: true,
      },
      orderBy: {
        siteYear: 'desc',
      },
    }),
  ]);
  const items = pearls.map((pearl) => toCatalogItem(pearl, filters));
  const active = toActiveFilterLinks(filters, pearls);

  return {
    documentGroups: groupCatalogBySiteDate(items),
    yearLinks: [...new Set(siteYears.map((pearl) => pearl.siteYear))]
      .map((year) => ({
        label: String(year),
        href: buildCatalogFilterHref(filters, { siteYear: year }),
        value: String(year),
      })),
    filters: {
      active,
      hasActive: active.length > 0,
      resetSiteYearHref: buildCatalogFilterHref(filters, { siteYear: null }),
    },
  };
}

export async function getPearl(year: string, slug: string): Promise<PearlDetail | null> {
  const siteYear = toPositiveInteger(year);

  if (!siteYear) {
    return null;
  }

  const pearl = await prisma.pearl.findFirst({
    where: {
      siteYear,
      slug,
    },
    include: {
      documents: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  return pearl ? toPearlDetail(pearl) : null;
}

export async function getSitemapPaths(): Promise<string[]> {
  const pearls = await prisma.pearl.findMany({
    select: {
      siteYear: true,
      slug: true,
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

  return ['/', ...pearls.map((pearl) => `/pearls/${pearl.siteYear}/${pearl.slug}`)];
}

function groupCatalogBySiteDate(documents: PearlCatalogItem[]): CatalogYearGroup[] {
  const yearGroups: CatalogYearGroup[] = [];

  for (const document of documents) {
    const year = String(document.siteYear);
    let yearGroup = yearGroups.find((group) => group.year === year);

    if (!yearGroup) {
      yearGroup = {
        year,
        months: [],
      };
      yearGroups.push(yearGroup);
    }

    const monthLabel = document.siteMonth ? document.siteMonthLabel : year;
    let monthGroup = yearGroup.months.find((group) => group.label === monthLabel);

    if (!monthGroup) {
      monthGroup = {
        label: monthLabel,
        documents: [],
      };
      yearGroup.months.push(monthGroup);
    }

    monthGroup.documents.push(document);
  }

  return yearGroups;
}

function toCatalogItem(pearl: PearlWithDocuments, filters: CatalogFilters): PearlCatalogItem {
  const year = String(pearl.siteYear);

  return {
    path: `/pearls/${year}/${pearl.slug}`,
    siteYear: pearl.siteYear,
    siteMonth: pearl.siteMonth,
    siteMonthLabel: toSitePublicationLabel(pearl),
    description: pearl.documents[0]?.description ?? toSitePublicationLabel(pearl),
    documents: pearl.documents.map((document) => toContainedDocument(document, filters)),
    downloads: {
      pdf: `/downloads/${year}/${pearl.slug}.pdf`,
      txt: `/downloads/${year}/${pearl.slug}.txt`,
      docx: `/downloads/${year}/${pearl.slug}.docx`,
      epub: `/downloads/${year}/${pearl.slug}.epub`,
    },
  };
}

function toContainedDocument(document: PrismaPearlDocument, filters: CatalogFilters): ContainedDocument {
  const header = toStringArray(document.header);
  const author = normalizeAuthorDisplayName(document.authorName);

  return {
    author,
    authorFilterHref: document.authorSlug ? buildCatalogFilterHref(filters, { authorSlug: document.authorSlug }) : null,
    title: document.documentTitle,
    partTitle: extractPartTitle(header),
    documentType: document.documentType,
    documentTypeFilterHref: buildCatalogFilterHref(filters, { documentType: document.documentType }),
    documentTypeLabel: documentTypeLabels[document.documentType] ?? document.documentType,
    rawHeader: header.join(' · '),
  };
}

function toPearlDetail(pearl: PearlWithDocuments): PearlDetail {
  return {
    slug: pearl.slug,
    title: pearl.title,
    sitePublication: {
      label: toSitePublicationLabel(pearl),
      year: pearl.siteYear,
      month: pearl.siteMonth,
    },
    documentsCount: pearl.documentsCount,
    documents: pearl.documents.map((document) => ({
      documentTitle: document.documentTitle,
      documentType: document.documentType,
      author: {
        name: normalizeAuthorDisplayName(document.authorName),
      },
      creation: {
        date: document.creationDate ? toDateValue(document.creationDate) : null,
        year: document.creationYear,
        raw: document.creationRaw,
      },
      parts: {
        header: toStringArray(document.header),
        body: toBody(document.content),
        footer: toStringArray(document.footer).map((text) => ({ text })),
      },
    })),
  };
}

function toActiveFilterLinks(filters: CatalogFilters, pearls: PearlWithDocuments[]): CatalogFilterLink[] {
  const links: CatalogFilterLink[] = [];

  if (filters.siteYear) {
    links.push({
      label: `Год сайта: ${filters.siteYear}`,
      href: buildCatalogFilterHref(filters, { siteYear: null }),
      value: String(filters.siteYear),
    });
  }

  if (filters.authorSlug) {
    links.push({
      label: `Владыка: ${findAuthorLabel(pearls, filters.authorSlug) ?? filters.authorSlug}`,
      href: buildCatalogFilterHref(filters, { authorSlug: null }),
      value: filters.authorSlug,
    });
  }

  if (filters.documentType) {
    links.push({
      label: `Тип: ${documentTypeLabels[filters.documentType] ?? filters.documentType}`,
      href: buildCatalogFilterHref(filters, { documentType: null }),
      value: filters.documentType,
    });
  }

  if (filters.q) {
    links.push({
      label: `Поиск: ${filters.q}`,
      href: buildCatalogFilterHref(filters, { q: null }),
      value: filters.q,
    });
  }

  return links;
}

function buildCatalogFilterHref(
  filters: CatalogFilters,
  overrides: Partial<Record<keyof CatalogFilters, string | number | null | undefined>>,
): string {
  const params = new URLSearchParams();
  const nextFilters: Record<keyof CatalogFilters, string | number | null | undefined> = {
    siteYear: filters.siteYear,
    authorSlug: filters.authorSlug,
    documentType: filters.documentType,
    q: filters.q,
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

async function findMatchingDocumentIds(filters: CatalogFilters): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT d."id"
    FROM "PearlDocument" d
    INNER JOIN "Pearl" p ON p."slug" = d."pearlSlug"
    WHERE (${filters.siteYear ?? null}::integer IS NULL OR p."siteYear" = ${filters.siteYear ?? null}::integer)
      AND (${filters.authorSlug ?? null}::text IS NULL OR d."authorSlug" = ${filters.authorSlug ?? null}::text)
      AND (${filters.documentType ?? null}::text IS NULL OR d."documentType" = ${filters.documentType ?? null}::text)
      AND (
        setweight(to_tsvector('russian', coalesce(d."authorName", '') || ' ' || coalesce(d."authorRaw", '')), 'A') ||
        setweight(to_tsvector('russian', coalesce(d."documentTitle", '') || ' ' || coalesce(d."description", '')), 'A') ||
        setweight(to_tsvector('russian', coalesce(d."creationRaw", '')), 'B') ||
        setweight(to_tsvector('russian', coalesce(d."content", '')), 'C')
      ) @@ websearch_to_tsquery('russian', ${filters.q ?? ''})
    ORDER BY ts_rank_cd(
      setweight(to_tsvector('russian', coalesce(d."authorName", '') || ' ' || coalesce(d."authorRaw", '')), 'A') ||
      setweight(to_tsvector('russian', coalesce(d."documentTitle", '') || ' ' || coalesce(d."description", '')), 'A') ||
      setweight(to_tsvector('russian', coalesce(d."creationRaw", '')), 'B') ||
      setweight(to_tsvector('russian', coalesce(d."content", '')), 'C'),
      websearch_to_tsquery('russian', ${filters.q ?? ''})
    ) DESC
  `;

  return rows.map((row) => row.id);
}

function toDocumentWhere(filters: Pick<CatalogFilters, 'authorSlug' | 'documentType'>) {
  return {
    ...(filters.authorSlug ? { authorSlug: filters.authorSlug } : {}),
    ...(filters.documentType ? { documentType: filters.documentType } : {}),
  };
}

function findAuthorLabel(pearls: PearlWithDocuments[], authorSlug: string): string | null {
  for (const pearl of pearls) {
    const document = pearl.documents.find((item) => item.authorSlug === authorSlug);

    if (document) {
      return normalizeAuthorDisplayName(document.authorName) ?? authorSlug;
    }
  }

  return null;
}

function toOptionalFilter(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
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

function toDateValue(value: Date): string {
  return value.toISOString().slice(0, 10);
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

function toPositiveInteger(value: string): number | null {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}
