import { basename, extname } from 'node:path';

export type SourcePublication = {
  year: string | null;
  yearNumber: number | null;
  quarter: number | null;
  quarterLabel: string | null;
  month: number | null;
  indexInQuarter: number | null;
};

const MONTH_MAP: Record<string, number> = {
  январь: 1,
  января: 1,
  january: 1,
  jan: 1,
  февраль: 2,
  февраля: 2,
  february: 2,
  feb: 2,
  март: 3,
  марта: 3,
  march: 3,
  mar: 3,
  апрель: 4,
  апреля: 4,
  april: 4,
  apr: 4,
  май: 5,
  мая: 5,
  may: 5,
  июнь: 6,
  июня: 6,
  june: 6,
  jun: 6,
  июль: 7,
  июля: 7,
  july: 7,
  jul: 7,
  август: 8,
  августа: 8,
  august: 8,
  aug: 8,
  сентябрь: 9,
  сентября: 9,
  september: 9,
  sep: 9,
  октябрь: 10,
  октября: 10,
  october: 10,
  oct: 10,
  ноябрь: 11,
  ноября: 11,
  november: 11,
  nov: 11,
  декабрь: 12,
  декабря: 12,
  december: 12,
  dec: 12,
};
const MONTH_WORD_PATTERN = new RegExp(`(?:^|[^\\p{L}])(${Object.keys(MONTH_MAP).join('|')})(?=$|[^\\p{L}])`, 'iu');

export function extractSourcePublication(sourcePath: string): SourcePublication {
  const normalizedPath = sourcePath.split('\\').join('/').normalize('NFC');
  const parts = normalizedPath.split('/');
  const fileName = basename(normalizedPath, extname(normalizedPath));
  const year = extractYear(parts);
  const pathWithoutFile = parts.slice(0, -1).join('/');
  const quarter = extractQuarterFromText(pathWithoutFile) ?? extractQuarterFromText(fileName);
  const month = extractMonth(parts, fileName, quarter);
  const resolvedQuarter = quarter ?? (month ? monthToQuarter(month) : null);
  const indexInQuarter = resolvedQuarter && month ? month - ((resolvedQuarter - 1) * 3) : null;

  return {
    year,
    yearNumber: year ? Number(year) : null,
    quarter: resolvedQuarter,
    quarterLabel: resolvedQuarter ? `${resolvedQuarter}-й квартал` : null,
    month,
    indexInQuarter,
  };
}

export function buildPublicationSlug(publication: SourcePublication, fallback: string): string {
  if (publication.year && publication.quarter && publication.indexInQuarter && publication.indexInQuarter >= 1 && publication.indexInQuarter <= 3) {
    return `${publication.year}Q${publication.quarter}-${publication.indexInQuarter}`;
  }

  return fallback;
}

export function extractMonthFromText(value: string): number | null {
  const normalized = normalizeYearSpaces(value).toLocaleLowerCase('ru-RU');
  const match = normalized.match(MONTH_WORD_PATTERN);

  return match ? MONTH_MAP[match[1]] ?? null : null;
}

export function normalizeSourceText(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase('ru-RU');
}

function extractYear(parts: string[]): string | null {
  return parts.find((part) => /^(?:19|20)\d{2}$/u.test(part)) ?? null;
}

function extractQuarterFromText(value: string): number | null {
  const normalized = normalizeSourceText(value);
  const fullQuarterMatch = normalized.match(/(?:^|[^\d])([1-4])\s*[-–]?\s*[йи]?\s+квартал(?:$|[^\p{L}])/iu);
  const shortBeforeMatch = normalized.match(/(?:^|[^\d])([1-4])\s*[_\s-]*кв\.?(?:$|[^\p{L}])/iu);
  const shortAfterMatch = normalized.match(/кв\.?\s*[_\s-]*([1-4])(?:$|[^\d])/iu);
  const match = fullQuarterMatch ?? shortBeforeMatch ?? shortAfterMatch;

  return match ? Number(match[1]) : null;
}

function extractMonth(parts: string[], fileName: string, quarter: number | null): number | null {
  const directoryParts = parts.slice(0, -1);

  return extractMonthFromNumberedPath(directoryParts)
    ?? extractMonthFromDirectoryText(directoryParts)
    ?? extractQuarterIndexFromFileName(fileName, quarter)
    ?? extractAbsoluteMonthFromFileName(fileName)
    ?? extractMonthFromText(fileName);
}

function extractMonthFromNumberedPath(parts: string[]): number | null {
  for (const part of parts) {
    const normalized = normalizeSourceText(part);

    if (/квартал|кв\.?/iu.test(normalized)) {
      continue;
    }

    const match = normalized.match(/^(0?[1-9]|1[0-2])(?:[_\-\s]|$)/u);
    const month = match ? Number(match[1]) : null;

    if (month && isMonth(month)) {
      return month;
    }
  }

  return null;
}

function extractMonthFromDirectoryText(parts: string[]): number | null {
  for (const part of parts) {
    if (/квартал|кв\.?/iu.test(part)) {
      continue;
    }

    const month = extractMonthFromText(part);

    if (month) {
      return month;
    }
  }

  return null;
}

function extractAbsoluteMonthFromFileName(fileName: string): number | null {
  const normalized = normalizeSourceText(fileName);
  const withYear = normalized.match(/(?:^|[^\d])(0?[1-9]|1[0-2])\s*[_\-. ]\s*(?:19|20)\d{2}(?:$|[^\d])/u);
  const leadingNumber = normalized.match(/^(0?[1-9]|1[0-2])(?:[_\-. ]|$)/u);
  const brochureNumber = normalized.match(/брошюра\D*(0?[1-9]|1[0-2])(?:$|[^\d])/iu);
  const match = withYear ?? leadingNumber ?? brochureNumber;
  const month = match ? Number(match[1]) : null;

  return month && isMonth(month) ? month : null;
}

function extractQuarterIndexFromFileName(fileName: string, quarter: number | null): number | null {
  if (!quarter) {
    return null;
  }

  const normalized = normalizeSourceText(fileName);
  const leadingBrochure = normalized.match(/^([1-3])\s*[_\-. ]\s*брошюра/iu);
  const issueAfterQuarter = normalized.match(/кв\.?\s*[_\s-]*[1-4]\s*[_\s-]*([1-3])(?:$|[^\d])/iu);
  const match = leadingBrochure ?? issueAfterQuarter;

  return match ? (quarter - 1) * 3 + Number(match[1]) : null;
}

function monthToQuarter(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

function isMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function normalizeYearSpaces(value: string): string {
  return value.replace(/((?:19|20)\d)\s+(\d{3})/gu, '$1$2');
}
