import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readPearlDocument } from '../catalog.js';
import { prisma } from '../db.js';
import type { Paragraph, PearlDocument, PearlInnerDocument, SitePublication } from '../types.js';

const rootDir = process.cwd();
const parsedDir = resolve(rootDir, 'data/parsed');

try {
  const jsonPaths = await listJsonFiles(parsedDir);

  await prisma.pearlDocument.deleteMany();
  await prisma.pearl.deleteMany();

  for (const jsonPath of jsonPaths) {
    const document = await readPearlDocument(jsonPath);

    await prisma.pearl.create({
      data: toPearlData(document),
    });
  }

  console.log(`Seeded ${jsonPaths.length} pearls`);
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

function toPearlData(document: PearlDocument) {
  const sitePublication = resolveSitePublication(document);
  const siteYear = sitePublication.year ?? parseYearFromPath(document.sourcePdf) ?? parseYearFromPath(document.jsonPath) ?? new Date().getFullYear();

  return {
    slug: document.slug,
    title: document.title,
    siteLabel: sitePublication.label,
    siteRawLabel: sitePublication.rawLabel,
    siteYear,
    siteMonth: sitePublication.month,
    siteMonths: sitePublication.months,
    siteSortDate: sitePublication.sortDate ?? `${siteYear}-01-01`,
    documentsCount: document.documentsCount,
    sourcePdf: document.sourcePdf,
    jsonPath: document.jsonPath,
    pages: document.meta.pages,
    layout: document.meta.layout,
    parsedAt: toRequiredDate(document.parsedAt),
    documents: {
      create: document.documents.map((innerDocument, index) => toPearlDocumentData(document.slug, innerDocument, index)),
    },
  };
}

function resolveSitePublication(document: PearlDocument): SitePublication {
  if (document.sitePublication.year && document.sitePublication.months.length > 0) {
    return document.sitePublication;
  }

  const sourceYear = parseYearFromPath(document.sourcePdf) ?? parseYearFromPath(document.jsonPath) ?? new Date().getFullYear();
  const quarterDate = parseDateFromQuarterFileName(document.sourcePdf);

  if (quarterDate && quarterDate.year === sourceYear) {
    return toSitePublication(null, null, quarterDate.year, [quarterDate.month]);
  }

  return {
    label: null,
    rawLabel: null,
    year: sourceYear,
    month: null,
    months: [],
    sortDate: `${sourceYear}-01-01`,
  };
}

function toSitePublication(label: string | null, rawLabel: string | null, year: number, months: number[]): SitePublication {
  return {
    label,
    rawLabel,
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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toPearlDocumentData(pearlSlug: string, document: PearlInnerDocument, index: number) {
  const body = document.parts.body;

  return {
    id: `${pearlSlug}-${index + 1}`,
    position: index + 1,
    documentTitle: document.documentTitle,
    documentType: document.documentType,
    description: toDescription(document, body),
    authorName: document.author.name,
    authorSlug: document.author.slug,
    authorRaw: document.author.raw,
    creationDate: toOptionalDate(document.creation.date),
    creationYear: document.creation.year,
    creationRaw: document.creation.raw,
    pearlVolume: document.pearlPublication.volume,
    pearlIssue: document.pearlPublication.issue,
    pearlDate: toOptionalDate(document.pearlPublication.date),
    pearlRawDate: document.pearlPublication.rawDate,
    pearlRaw: document.pearlPublication.raw,
    header: document.parts.header,
    footer: document.parts.footer,
    paragraphsCount: body.length,
    content: body.map((paragraph) => paragraph.text).join('\n\n'),
  };
}

function toDescription(document: PearlInnerDocument, body: Paragraph[]): string {
  const text = body.find((paragraph) => paragraph.text.trim().length > 80)?.text ?? document.parts.header.join('. ');

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
