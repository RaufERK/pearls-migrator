import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PearlDocument } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const parsedDir = resolve(rootDir, 'data/parsed');

const MONTH_MAP: Record<string, number> = {
  январь: 1, января: 1,
  февраль: 2, февраля: 2,
  март: 3, марта: 3,
  апрель: 4, апреля: 4,
  май: 5, мая: 5,
  июнь: 6, июня: 6,
  июль: 7, июля: 7,
  август: 8, августа: 8,
  сентябрь: 9, сентября: 9,
  октябрь: 10, октября: 10,
  ноябрь: 11, ноября: 11,
  декабрь: 12, декабря: 12,
};

type LegacyPearlDocument = Partial<PearlDocument> & {
  day?: number | null;
  month?: number | null;
  paragraphs?: { text: string }[];
  publishedAt?: string | null;
  sortDate?: string;
  speaker?: string | null;
  sourcePath?: string;
  subtitle?: string[];
  year?: number;
  months?: number[];
};

function parseDateLine(line: string): { year: number; month: number } | null {
  const lower = line.toLowerCase().replace(/\b((?:19|20))\s+(\d{2})\b/g, '$1$2').trim();

  const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[0], 10);
  const months: number[] = [];

  for (const [word, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(word)) {
      if (!months.includes(num)) months.push(num);
    }
  }

  if (months.length === 0) return null;

  months.sort((a, b) => a - b);
  return { year, month: months[0] };
}

function findDateInSubtitle(subtitle: string[]): { year: number; month: number } | null {
  for (const line of subtitle) {
    const result = parseDateLine(line);
    if (result) return result;
  }
  return null;
}

const files = await listJsonFiles(parsedDir);

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = resolve(parsedDir, file);
  const raw = await readFile(filePath, 'utf8');
  const doc = JSON.parse(raw) as LegacyPearlDocument;

  const subtitle: string[] = doc.subtitle ?? [];
  const sourcePdf = doc.sourcePdf ?? toRelativeSourcePdf(doc.sourcePath);
  const date = parseDateFromFileName(sourcePdf) ?? parseDateFromQuarterFileName(sourcePdf) ?? findDateInSubtitle(subtitle);

  if (!date) {
    console.warn(`⚠  No date found: ${file}`);
    skipped++;
    continue;
  }

  const day = hasDay(date) ? date.day : null;

  doc.year = date.year;
  doc.month = date.month;
  doc.day = day;
  doc.publishedAt = `${date.year}-${pad2(date.month)}-${pad2(day ?? 1)}`;
  doc.sortDate = doc.publishedAt;
  doc.speaker = doc.speaker ?? extractSpeaker(sourcePdf);
  doc.slug = day ? `${date.year}-${pad2(date.month)}-${pad2(day)}${doc.speaker ? `-${toSlugPart(doc.speaker)}` : ''}` : `${date.year}-${pad2(date.month)}`;
  doc.sourcePdf = sourcePdf;
  doc.jsonPath = toRelativeJsonPath(filePath);
  doc.parsedAt = doc.parsedAt ?? new Date().toISOString();

  delete doc.sourcePath;
  delete doc.months;

  await writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`✓  ${file} → ${doc.slug}`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);

async function listJsonFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }

      return entry.isFile() && extname(entry.name) === '.json' ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function parseDateFromFileName(sourcePdf: string): { year: number; month: number; day: number } | null {
  const match = basename(sourcePdf, extname(sourcePdf)).match(/(?:^|[^0-9])((?:19|20)\d{2})[_-](\d{1,2})[_-](\d{1,2})(?:[^0-9]|$)/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseDateFromQuarterFileName(sourcePdf: string): { year: number; month: number } | null {
  const match = basename(sourcePdf, extname(sourcePdf)).match(/^((?:19|20)\d{2})Q([1-4])-(\d)\b/);

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

function hasDay(date: { year: number; month: number } | { year: number; month: number; day: number }): date is { year: number; month: number; day: number } {
  return 'day' in date;
}

function toRelativeSourcePdf(sourcePath: string | undefined): string {
  if (!sourcePath) {
    return '';
  }

  const pearlsIndex = sourcePath.indexOf('/pearls/');

  return pearlsIndex >= 0 ? sourcePath.slice(pearlsIndex + 1) : sourcePath;
}

function toRelativeJsonPath(filePath: string): string {
  const parsedIndex = filePath.indexOf('/data/parsed/');

  return parsedIndex >= 0 ? filePath.slice(parsedIndex + 1) : filePath;
}

function extractSpeaker(sourcePdf: string): string | null {
  const fileName = basename(sourcePdf, extname(sourcePdf));
  const withoutDate = fileName
    .replace(/^((?:19|20)\d{2})[_-]\d{1,2}[_-]\d{1,2}[_-]?/, '')
    .replace(/^((?:19|20)\d{2})Q[1-4]-\d[_-]?/, '')
    .trim();
  const speaker = withoutDate
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return speaker.length > 0 && speaker !== fileName ? speaker : null;
}

function toSlugPart(value: string): string {
  return value
    .replace(/&/g, ' and ')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
