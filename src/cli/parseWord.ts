import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractWordPearlDocument } from '../word/extractWordPearl.js';

type ParseWordOptions = {
  files: string[];
  years: string[];
  quarters: string[];
};

type PreparedDocx = {
  preparedPath: string;
  preparedRelativePath: string;
  sourceWordPath: string;
  sourceWordRelativePath: string;
  jsonPath: string;
  outputPath: string;
  year: string;
  quarter: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const preparedRootDir = resolve(rootDir, 'data/word-docx');
const sourceRootDir = resolve(rootDir, 'data/source-data/pearls-word');
const parsedRootDir = resolve(rootDir, 'data/parsed');
const MONTH_MAP: Record<string, number> = {
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
const MONTH_WORD_PATTERN = new RegExp(`(?:^|[^\\p{L}])(${Object.keys(MONTH_MAP).join('|')})(?=$|[^\\p{L}])`, 'iu');
const options = parseArgs(process.argv.slice(2));
const preparedDocxFiles = filterPreparedDocx(await listPreparedDocx(preparedRootDir), options);

console.log(`Parsing ${preparedDocxFiles.length} prepared DOCX files`);

for (const file of preparedDocxFiles) {
  const document = await extractWordPearlDocument(file.preparedPath, {
    sourceWord: file.sourceWordRelativePath,
    preparedDocx: file.preparedRelativePath,
    jsonPath: file.jsonPath,
  });

  await mkdir(dirname(file.outputPath), { recursive: true });
  await writeFile(file.outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  const paragraphsCount = document.documents.reduce((count, innerDocument) => count + innerDocument.parts.body.length, 0);

  console.log(`Parsed ${document.slug}: ${document.documents.length} documents, ${paragraphsCount} paragraphs`);
  console.log(`Site publication: ${document.sitePublication.label ?? document.sitePublication.year ?? 'unknown'}`);
  console.log(`Source Word: ${file.sourceWordRelativePath}`);
  console.log(`Saved: ${file.outputPath}`);
}

function parseArgs(args: string[]): ParseWordOptions {
  const options: ParseWordOptions = {
    files: [],
    years: [],
    quarters: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('--year=')) {
      options.years.push(arg.slice('--year='.length));
      continue;
    }

    if (arg === '--year') {
      options.years.push(readNextArg(args, index, '--year'));
      index++;
      continue;
    }

    if (arg.startsWith('--quarter=')) {
      options.quarters.push(arg.slice('--quarter='.length));
      continue;
    }

    if (arg === '--quarter') {
      options.quarters.push(readNextArg(args, index, '--quarter'));
      index++;
      continue;
    }

    if (arg.startsWith('--file=')) {
      options.files.push(arg.slice('--file='.length));
      continue;
    }

    if (arg === '--file') {
      options.files.push(readNextArg(args, index, '--file'));
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run parse:word -- [options]',
    '',
    'Options:',
    '  --year <year>          Parse only one prepared DOCX year',
    '  --quarter <quarter>    Parse only one quarter folder, e.g. "1-й квартал"',
    '  --file <path>          Parse one prepared DOCX file',
    '  --help                 Show this help',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

async function listPreparedDocx(dirPath: string): Promise<PreparedDocx[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listPreparedDocx(entryPath);
      }

      if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.docx') {
        return [];
      }

      const preparedRelativePath = toRelativePath(rootDir, entryPath);
      const [year, quarter] = toRelativePath(preparedRootDir, entryPath).split('/');

      if (!year || !quarter) {
        return [];
      }

      const sourceWordPath = await resolveSourceWordPath(year, quarter, entry.name);
      const sourceWordRelativePath = toRelativePath(rootDir, sourceWordPath);
      const jsonPath = toJsonPath(sourceWordRelativePath);

      return [{
        preparedPath: entryPath,
        preparedRelativePath,
        sourceWordPath,
        sourceWordRelativePath,
        jsonPath,
        outputPath: resolve(rootDir, jsonPath),
        year,
        quarter,
      }];
    }),
  );

  return files.flat().sort((a, b) => a.preparedRelativePath.localeCompare(b.preparedRelativePath));
}

async function resolveSourceWordPath(year: string, quarter: string, preparedFileName: string): Promise<string> {
  const quarterDir = resolve(sourceRootDir, year, quarter);
  const brochureDirs = await listBrochureDirs(quarterDir);
  const baseName = basename(preparedFileName, extname(preparedFileName));

  for (const brochureDir of brochureDirs) {
    for (const extension of ['.docx', '.doc']) {
      const candidate = resolve(brochureDir, `${baseName}${extension}`);

      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(`Original Word source not found for prepared DOCX: ${year}/${quarter}/${preparedFileName}`);
}

async function listBrochureDirs(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && normalizeText(entry.name) === normalizeText('Брошюры'))
    .map((entry) => resolve(dirPath, entry.name));
}

function filterPreparedDocx(files: PreparedDocx[], options: ParseWordOptions): PreparedDocx[] {
  const requestedFiles = options.files.map(toRelativePathFromRoot);
  const years = new Set(options.years);
  const quarters = new Set(options.quarters.map(normalizeText));

  return files.filter((file) => {
    const matchesFile = requestedFiles.length === 0 || requestedFiles.includes(file.preparedRelativePath);
    const matchesYear = years.size === 0 || years.has(file.year);
    const matchesQuarter = quarters.size === 0 || quarters.has(normalizeText(file.quarter));

    return matchesFile && matchesYear && matchesQuarter;
  });
}

function toJsonPath(sourceWordRelativePath: string): string {
  const parts = sourceWordRelativePath.normalize('NFC').split('/');
  const yearIndex = parts.findIndex((part) => /^(?:19|20)\d{2}$/u.test(part));
  const year = yearIndex >= 0 ? parts[yearIndex] : 'archive';
  const quarter = parseQuarter(yearIndex >= 0 ? parts[yearIndex + 1] ?? '' : '');
  const month = parseMonthFromFileName(basename(sourceWordRelativePath, extname(sourceWordRelativePath)));
  const indexInQuarter = quarter && month ? month - ((quarter - 1) * 3) : null;
  const slug = quarter && indexInQuarter && indexInQuarter >= 1 && indexInQuarter <= 3
    ? `${year}Q${quarter}-${indexInQuarter}`
    : basename(sourceWordRelativePath, extname(sourceWordRelativePath));

  return `data/parsed/${year}/${slug}.json`;
}

function parseQuarter(value: string): number | null {
  const match = value.normalize('NFC').match(/^([1-4])-[йи]\s+квартал$/iu);

  return match ? Number(match[1]) : null;
}

function parseMonthFromFileName(fileName: string): number | null {
  const lower = fileName.normalize('NFC').toLocaleLowerCase('ru-RU');
  const match = lower.match(MONTH_WORD_PATTERN);

  return match ? MONTH_MAP[match[1]] ?? null : null;
}

function toRelativePathFromRoot(filePath: string): string {
  const normalized = isAbsolute(filePath) ? relative(rootDir, filePath) : filePath;

  return normalized.replace(/^\.\//u, '').split(sep).join('/').normalize('NFC');
}

function normalizeText(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase('ru-RU');
}

function toRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/').normalize('NFC');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}
