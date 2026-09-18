export const catalogPearlOrderBy = [
  {
    siteSortDate: 'desc' as const,
  },
  {
    slug: 'desc' as const,
  },
];

export type CatalogGroupItem = {
  siteYear: number;
  siteMonth: number | null;
  siteMonthLabel: string;
};

export type CatalogYearGroup<T extends CatalogGroupItem> = {
  year: string;
  months: {
    label: string;
    documents: T[];
  }[];
};

export function uniqueYearsDescending(years: Iterable<number>): number[] {
  return [...new Set(years)].sort((a, b) => b - a);
}

export function groupCatalogBySiteDate<T extends CatalogGroupItem>(documents: T[]): CatalogYearGroup<T>[] {
  const yearGroups: CatalogYearGroup<T>[] = [];

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

  yearGroups.sort((a, b) => Number(b.year) - Number(a.year));

  for (const yearGroup of yearGroups) {
    yearGroup.months.sort((a, b) => {
      const aMonth = a.documents[0]?.siteMonth ?? 0;
      const bMonth = b.documents[0]?.siteMonth ?? 0;

      return bMonth - aMonth;
    });
  }

  return yearGroups;
}
