import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function parseDateLine(line: string): { year: number; months: number[] } | null {
  const lower = line.toLowerCase().trim();

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
  return { year, months };
}

function findDateInSubtitle(subtitle: string[]): { year: number; months: number[] } | null {
  for (const line of subtitle) {
    const result = parseDateLine(line);
    if (result) return result;
  }
  return null;
}

const files = (await readdir(parsedDir)).filter((f) => extname(f) === '.json');

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = resolve(parsedDir, file);
  const raw = await readFile(filePath, 'utf8');
  const doc = JSON.parse(raw);

  const subtitle: string[] = doc.subtitle ?? [];
  const date = findDateInSubtitle(subtitle);

  if (!date) {
    console.warn(`⚠  No date found: ${file}`);
    skipped++;
    continue;
  }

  doc.year = date.year;
  doc.months = date.months;

  await writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`✓  ${file} → year=${date.year}, months=[${date.months.join(', ')}]`);
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
