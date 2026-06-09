import type { Pearl, PearlDocument as PrismaPearlDocument } from '../generated/prisma/client';

import { prisma } from './prisma';

export type CatalogFilterLink = {
  label: string;
  href: string;
};

export type ContainedDocument = {
  author: string | null;
  title: string | null;
  partTitle?: string | null;
  creationLabel?: string | null;
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

const documentTypeLabels: Record<string, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  teaching: 'Учения',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export async function getCatalog(siteYear: number | null): Promise<CatalogResponse> {
  const filters: CatalogFilters = {
    siteYear: siteYear ?? undefined,
  };
  const [pearls, siteYears] = await Promise.all([
    prisma.pearl.findMany({
      where: {
        siteYear: filters.siteYear,
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
  const active = toActiveFilterLinks(filters);

  return {
    documentGroups: groupCatalogBySiteDate(items),
    yearLinks: [...new Set(siteYears.map((pearl) => pearl.siteYear))]
      .map((year) => ({
        label: String(year),
        href: buildCatalogFilterHref(filters, { siteYear: year }),
      })),
    filters: {
      active,
      hasActive: active.length > 0,
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
      txt: `/downloads/${year}/${pearl.slug}.txt`,
      docx: `/downloads/${year}/${pearl.slug}.docx`,
      epub: `/downloads/${year}/${pearl.slug}.epub`,
    },
  };
}

function toContainedDocument(document: PrismaPearlDocument, filters: CatalogFilters): ContainedDocument {
  const header = toStringArray(document.header);
  const author = normalizeAuthorDisplayName(document.authorName);
  const creationLabel = toCreationDateLabel(document.creationDate) ?? (document.creationYear ? String(document.creationYear) : null);

  return {
    author,
    title: document.documentTitle,
    partTitle: extractPartTitle(header),
    creationLabel,
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

function toActiveFilterLinks(filters: CatalogFilters): CatalogFilterLink[] {
  return filters.siteYear
    ? [{
        label: `Год сайта: ${filters.siteYear}`,
        href: buildCatalogFilterHref(filters, { siteYear: null }),
      }]
    : [];
}

function buildCatalogFilterHref(
  filters: CatalogFilters,
  overrides: Partial<Record<keyof CatalogFilters, string | number | null | undefined>>,
): string {
  const params = new URLSearchParams();
  const nextFilters: Record<keyof CatalogFilters, string | number | null | undefined> = {
    siteYear: filters.siteYear,
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
