import { cp, mkdir, open, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBrochureSlug, resolveBrochureSource } from '../brochureSource.js';
import { convertWithLibreOffice, resolveSofficePath } from '../libreOffice.js';
import {
  getPreparedRootDir,
  getSourceRootDir,
  isCanonicalBrochureStem,
  parseQuarterSegment,
  parseSourcePathParts,
  sourceWordDirName,
  toCanonicalQuarterName,
} from '../sourceArchive.js';

type PrepareOptions = {
  years: string[];
  quarters: string[];
  slugs: string[];
  dryRun: boolean;
  force: boolean;
};

type WordSourceExtension = '.doc' | '.docx';

type WordSource = {
  sourcePath: string;
  sourceRelativePath: string;
  outputPath: string;
  outputRelativePath: string;
  year: string;
  quarter: string;
  quarterNumber: number;
  extension: WordSourceExtension;
  slug: string;
};

type PrepareResult = 'converted' | 'copied' | 'skipped' | 'skipped-invalid' | 'would-convert' | 'would-copy';

/** OLE Compound File magic used by legacy .doc */
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
/** ZIP local-file header magic used by .docx */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]);

const EXTENSION_RANK: Record<WordSourceExtension, number> = {
  '.docx': 1,
  '.doc': 2,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const sourceRootDir = getSourceRootDir(rootDir);
const preparedRootDir = getPreparedRootDir(rootDir);
const tempRootDir = resolve(rootDir, 'tmp/converted');

const options = parseArgs(process.argv.slice(2));
const sources = await resolveSources(options);
const needsLibreOffice = !options.dryRun && sources.some((source) => source.extension === '.doc');
const sofficePath = needsLibreOffice ? await resolveSofficePath() : null;
const counts: Record<PrepareResult, number> = {
  converted: 0,
  copied: 0,
  skipped: 0,
  'skipped-invalid': 0,
  'would-convert': 0,
  'would-copy': 0,
};

console.log(`Found ${sources.length} Word brochure(s)`);

if (options.dryRun) {
  console.log('Dry run: no files will be written');
}

for (const source of sources) {
  const result = await prepareDocx(source, options, sofficePath);
  counts[result]++;

  console.log(`${result}: ${source.sourceRelativePath} -> ${source.outputRelativePath}`);
}

console.log([
  `Done: ${sources.length} files`,
  `converted: ${counts.converted}`,
  `copied: ${counts.copied}`,
  `skipped: ${counts.skipped}`,
  `skipped-invalid: ${counts['skipped-invalid']}`,
  `would-convert: ${counts['would-convert']}`,
  `would-copy: ${counts['would-copy']}`,
].join('\n'));

async function resolveSources(options: PrepareOptions): Promise<WordSource[]> {
  if (options.slugs.length > 0) {
    const sources = await Promise.all(options.slugs.map(async (slug) => {
      const brochure = await resolveBrochureSource(rootDir, slug);

      if (brochure.extension === '.pdf') {
        throw new Error(
          `Slug ${slug} resolves to a PDF (${brochure.sourceRelativePath}). `
          + 'Use npm run parse:pdf / npm run refresh for PDF sources — prepare:docx is Word-only.',
        );
      }

      return {
        sourcePath: brochure.sourcePath,
        sourceRelativePath: brochure.sourceRelativePath,
        outputPath: brochure.preparedDocxPath,
        outputRelativePath: brochure.preparedDocxRelativePath,
        year: brochure.year,
        quarter: brochure.quarter,
        quarterNumber: brochure.quarterNumber,
        extension: brochure.extension,
        slug: brochure.slug,
      };
    }));

    return sources.sort((a, b) => a.sourceRelativePath.localeCompare(b.sourceRelativePath));
  }

  return dedupeSources(filterSources(await listWordSources(sourceRootDir), options));
}

function parseArgs(args: string[]): PrepareOptions {
  const options: PrepareOptions = {
    years: [],
    quarters: [],
    slugs: [],
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
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

    if (arg.startsWith('--slug=')) {
      options.slugs.push(parseBrochureSlug(arg.slice('--slug='.length)).slug);
      continue;
    }

    if (arg === '--slug') {
      options.slugs.push(parseBrochureSlug(readNextArg(args, index, '--slug')).slug);
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run prepare:docx -- [options]',
    '',
    'Options:',
    '  --year <year>          Prepare only one source year',
    '  --quarter <quarter>    Prepare only one quarter folder, e.g. Q1',
    '  --slug <slug>          Prepare one Word brochure, e.g. 2011Q4-2 (PDF: use parse:pdf)',
    '  --dry-run              Show what would be prepared without writing files',
    '  --force                Rebuild prepared DOCX even when output is fresh',
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

async function listWordSources(dirPath: string): Promise<WordSource[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const sources = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory() && isWordSourceDir(entry.name)) {
        return listWordDirSources(entryPath);
      }

      if (entry.isDirectory()) {
        return listWordSources(entryPath);
      }

      return [];
    }),
  );

  return sources.flat().sort((a, b) => a.sourceRelativePath.localeCompare(b.sourceRelativePath));
}

async function listWordDirSources(dirPath: string): Promise<WordSource[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const relativeDirPath = toRelativePath(sourceRootDir, dirPath);
  const sourceParts = parseSourcePathParts(relativeDirPath);
  const quarterNumber = sourceParts.quarter;

  if (!sourceParts.year || !quarterNumber) {
    return [];
  }

  const year = String(sourceParts.year);
  const quarter = toCanonicalQuarterName(quarterNumber);

  return entries
    .filter((entry) => entry.isFile() && isSupportedSourceFile(entry.name))
    .map((entry) => {
      const sourcePath = resolve(dirPath, entry.name);
      const extension = extname(entry.name).toLowerCase() as WordSourceExtension;
      const slug = basename(entry.name, extname(entry.name));
      const outputPath = resolve(preparedRootDir, year, quarter, sourceWordDirName, `${slug}.docx`);

      return {
        sourcePath,
        sourceRelativePath: toRelativePath(rootDir, sourcePath),
        outputPath,
        outputRelativePath: toRelativePath(rootDir, outputPath),
        year,
        quarter,
        quarterNumber,
        extension,
        slug,
      };
    });
}

function filterSources(sources: WordSource[], options: PrepareOptions): WordSource[] {
  const years = new Set(options.years);
  const quarters = new Set(options.quarters.map(parseQuarterSegment).filter((quarter): quarter is number => quarter !== null));
  const slugs = new Set(options.slugs);

  return sources.filter((source) => {
    const matchesYear = years.size === 0 || years.has(source.year);
    const matchesQuarter = quarters.size === 0 || quarters.has(source.quarterNumber);
    const matchesSlug = slugs.size === 0 || slugs.has(source.slug);

    return matchesYear && matchesQuarter && matchesSlug;
  });
}

function dedupeSources(sources: WordSource[]): WordSource[] {
  const byOutputPath = new Map<string, WordSource>();

  for (const source of sources) {
    const existing = byOutputPath.get(source.outputPath);

    if (!existing || shouldPreferSource(source, existing)) {
      byOutputPath.set(source.outputPath, source);
    }
  }

  return [...byOutputPath.values()].sort((a, b) => a.sourceRelativePath.localeCompare(b.sourceRelativePath));
}

function shouldPreferSource(next: WordSource, current: WordSource): boolean {
  const nextRank = EXTENSION_RANK[next.extension];
  const currentRank = EXTENSION_RANK[current.extension];

  if (nextRank !== currentRank) {
    return nextRank < currentRank;
  }

  return next.sourceRelativePath.localeCompare(current.sourceRelativePath) < 0;
}

async function prepareDocx(source: WordSource, options: PrepareOptions, sofficePath: string | null): Promise<PrepareResult> {
  if (!options.force && await isOutputFresh(source)) {
    return 'skipped';
  }

  if (!(await looksLikeWordDocument(source.sourcePath, source.extension))) {
    console.warn(`skip invalid Word file (not a real ${source.extension}): ${source.sourceRelativePath}`);
    return 'skipped-invalid';
  }

  if (options.dryRun) {
    return source.extension === '.docx' ? 'would-copy' : 'would-convert';
  }

  await mkdir(dirname(source.outputPath), { recursive: true });

  if (source.extension === '.docx') {
    await cp(source.sourcePath, source.outputPath, { force: true });

    return 'copied';
  }

  if (!sofficePath) {
    throw new Error('LibreOffice is required to convert .doc files');
  }

  await convertSourceToDocx(source, sofficePath);

  return 'converted';
}

async function convertSourceToDocx(source: WordSource, sofficePath: string): Promise<void> {
  const tempDir = resolve(tempRootDir, createHash('sha1').update(source.sourceRelativePath).digest('hex').slice(0, 12));

  await convertWithLibreOffice({
    sofficePath,
    sourcePath: source.sourcePath,
    outputPath: source.outputPath,
    targetExtension: 'docx',
    tempDir,
    cwd: rootDir,
    sourceLabel: source.sourceRelativePath,
  });
}

async function looksLikeWordDocument(filePath: string, extension: WordSourceExtension): Promise<boolean> {
  try {
    const handle = await open(filePath, 'r');

    try {
      const header = Buffer.alloc(8);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);

      if (bytesRead < 4) {
        return false;
      }

      if (extension === '.doc') {
        return header.subarray(0, OLE_MAGIC.length).equals(OLE_MAGIC);
      }

      return header.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

async function isOutputFresh(source: WordSource): Promise<boolean> {
  try {
    const [sourceStat, outputStat] = await Promise.all([
      stat(source.sourcePath),
      stat(source.outputPath),
    ]);

    return outputStat.mtimeMs >= sourceStat.mtimeMs;
  } catch {
    return false;
  }
}

function isWordSourceDir(value: string): boolean {
  const normalized = normalizeText(value);

  return normalized === sourceWordDirName || normalized === normalizeText('Брошюры') || normalized === normalizeText('Брошюра');
}

function isSupportedSourceFile(fileName: string): boolean {
  if (fileName.startsWith('~$')) {
    return false;
  }

  const extension = extname(fileName).toLowerCase();

  if (extension !== '.doc' && extension !== '.docx') {
    return false;
  }

  return isCanonicalBrochureStem(fileName);
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

function toRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/');
}
