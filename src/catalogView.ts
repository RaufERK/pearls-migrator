import { buildCatalogFilterHref } from './catalog.js';
import type { CatalogFilterLink, CatalogFilters, PearlCatalogItem } from './types.js';

export type CatalogMonthGroup = {
  label: string;
  documents: PearlCatalogItem[];
};

export type CatalogYearGroup = {
  year: string;
  months: CatalogMonthGroup[];
};

export function groupCatalogBySiteDate(documents: PearlCatalogItem[]): CatalogYearGroup[] {
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

export function toActiveFilterLinks(filters: CatalogFilters): CatalogFilterLink[] {
  const activeFilters: CatalogFilterLink[] = [];

  if (filters.siteYear) {
    activeFilters.push({
      label: `Год сайта: ${filters.siteYear}`,
      href: buildCatalogFilterHref(filters, { siteYear: null }),
    });
  }

  return activeFilters;
}

export function toYearFilterLinks(documents: PearlCatalogItem[], filters: CatalogFilters): CatalogFilterLink[] {
  return [...new Set(documents.map((document) => document.siteYear))]
    .sort((a, b) => b - a)
    .map((year) => ({
      label: String(year),
      href: buildCatalogFilterHref(filters, { siteYear: year }),
    }));
}
