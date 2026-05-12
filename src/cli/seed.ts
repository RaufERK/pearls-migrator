import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readPearlDocument } from '../catalog.js';
import { extractContainedDocuments } from '../containedDocuments.js';
import { prisma } from '../db.js';
import type { ContainedDocument, Paragraph, PearlDocument, SitePublication } from '../types.js';

const rootDir = process.cwd();
const parsedDir = resolve(rootDir, 'data/parsed');
const monthMap: Record<string, number> = {
  январь: 1,
  января: 1,
  февраль: 2,
  февраля: 2,
  март: 3,
  марта: 3,
  апрель: 4,
  апреля: 4,
  май: 5,
  мая: 5,
  июнь: 6,
  июня: 6,
  июль: 7,
  июля: 7,
  август: 8,
  августа: 8,
  сентябрь: 9,
  сентября: 9,
  октябрь: 10,
  октября: 10,
  ноябрь: 11,
  ноября: 11,
  декабрь: 12,
  декабря: 12,
};

try {
  const jsonPaths = await listJsonFiles(parsedDir);

  for (const jsonPath of jsonPaths) {
    const document = await readPearlDocument(jsonPath);

    await prisma.lecture.upsert({
      where: {
        slug: document.slug,
      },
      create: toLectureData(document),
      update: toLectureData(document),
    });
  }

  console.log(`Seeded ${jsonPaths.length} lectures`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

async function listJsonFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function toLectureData(document: PearlDocument) {
  const body = getBody(document);
  const sitePublication = resolveSitePublication(document);
  const containedDocuments = getContainedDocuments(document);

  return {
    slug: document.slug,
    title: document.title,
    documentTitle: document.documentTitle,
    documentType: document.documentType,
    description: toDescription(document, body),
    authorName: document.author.name,
    authorSlug: document.author.slug,
    siteYear: sitePublication.year ?? document.year,
    siteMonth: sitePublication.month ?? document.month,
    siteMonths: sitePublication.months,
    siteSortDate: sitePublication.sortDate ?? document.sortDate,
    creationDate: toOptionalDate(document.creation.date),
    creationYear: document.creation.year,
    pearlVolume: document.pearlPublication.volume,
    pearlIssue: document.pearlPublication.issue,
    pearlDate: toOptionalDate(document.pearlPublication.date),
    sourcePdf: document.sourcePdf,
    jsonPath: document.jsonPath,
    pages: document.meta.pages,
    paragraphsCount: body.length,
    layout: document.meta.layout,
    content: body.map((paragraph) => paragraph.text).join('\n\n'),
    containedDocs: containedDocuments,
    parsedAt: toRequiredDate(document.parsedAt),
  };
}

function getContainedDocuments(document: PearlDocument): ContainedDocument[] {
  return document.containedDocuments?.length ? document.containedDocuments : extractContainedDocuments(document);
}

function resolveSitePublication(document: PearlDocument): SitePublication {
  const sourceYear = parseYearFromPath(document.sourcePdf) ?? parseYearFromPath(document.jsonPath) ?? document.year;
  const subtitleDate = findSitePublicationInSubtitle(document.subtitle, sourceYear);

  if (subtitleDate) {
    return subtitleDate;
  }

  const quarterDate = parseDateFromQuarterFileName(document.sourcePdf);

  if (quarterDate && quarterDate.year === sourceYear) {
    return toSitePublication(null, quarterDate.year, [quarterDate.month]);
  }

  if (document.sitePublication.year === sourceYear && document.sitePublication.months.length > 0) {
    return document.sitePublication;
  }

  return {
    label: null,
    year: sourceYear,
    month: null,
    months: [],
    sortDate: `${sourceYear}-01-01`,
  };
}

function findSitePublicationInSubtitle(subtitle: string[], sourceYear: number): SitePublication | null {
  for (const line of subtitle.slice(0, 5)) {
    const parsed = parsePublicationLine(line, sourceYear);

    if (parsed) {
      return toSitePublication(normalizeYearSpaces(line), sourceYear, parsed.months);
    }
  }

  return null;
}

function parsePublicationLine(value: string, sourceYear: number): { months: number[] } | null {
  const normalized = normalizeYearSpaces(value).toLowerCase();
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/u);

  if (!yearMatch || Number(yearMatch[0]) !== sourceYear) {
    return null;
  }

  const months = Object.entries(monthMap)
    .filter(([word]) => normalized.includes(word))
    .map(([, month]) => month)
    .filter((month, index, all) => all.indexOf(month) === index)
    .sort((a, b) => a - b);

  return months.length > 0 ? { months } : null;
}

function toSitePublication(label: string | null, year: number, months: number[]): SitePublication {
  return {
    label,
    year,
    month: months[0] ?? null,
    months: months.map((month) => `${year}-${pad2(month)}`),
    sortDate: months[0] ? `${year}-${pad2(months[0])}-01` : `${year}-01-01`,
  };
}

function parseYearFromPath(value: string): number | null {
  const match = value.match(/(?:^|\/)(19|20)\d{2}(?:\/|$)/u);

  return match ? Number(match[0].replace(/\D/g, '')) : null;
}

function parseDateFromQuarterFileName(value: string): { year: number; month: number } | null {
  const match = value.match(/(?:^|\/)((?:19|20)\d{2})Q([1-4])-(\d)(?:\.[^.]+)?$/iu);

  if (!match) {
    return null;
  }

  const quarter = Number(match[2]);
  const indexInQuarter = Number(match[3]);

  if (indexInQuarter < 1 || indexInQuarter > 3) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: (quarter - 1) * 3 + indexInQuarter,
  };
}

function normalizeYearSpaces(value: string): string {
  return value.replace(/\b([12])\s*(\d)\s*(\d)\s*(\d)\b/gu, '$1$2$3$4');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getBody(document: PearlDocument): Paragraph[] {
  return document.parts.body.length > 0 ? document.parts.body : document.paragraphs;
}

function toDescription(document: PearlDocument, body: Paragraph[]): string {
  const text = body.find((paragraph) => paragraph.text.trim().length > 80)?.text ?? document.subtitle.join('. ');

  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function toOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  return toRequiredDate(value);
}

function toRequiredDate(value: string): Date {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}
