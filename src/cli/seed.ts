import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readPearlDocument } from '../catalog.js';
import { prisma } from '../db.js';
import type { Paragraph, PearlDocument } from '../types.js';

const rootDir = process.cwd();
const parsedDir = resolve(rootDir, 'data/parsed');

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

  return {
    slug: document.slug,
    title: document.title,
    documentTitle: document.documentTitle,
    documentType: document.documentType,
    description: toDescription(document, body),
    authorName: document.author.name,
    authorSlug: document.author.slug,
    siteYear: document.sitePublication.year ?? document.year,
    siteMonth: document.sitePublication.month ?? document.month,
    siteMonths: document.sitePublication.months,
    siteSortDate: document.sitePublication.sortDate ?? document.sortDate,
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
    parsedAt: toRequiredDate(document.parsedAt),
  };
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
