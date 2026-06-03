import { access, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

type PrepareOptions = {
  years: string[];
  quarters: string[];
  dryRun: boolean;
  force: boolean;
};

type WordSource = {
  sourcePath: string;
  sourceRelativePath: string;
  outputPath: string;
  outputRelativePath: string;
  year: string;
  quarter: string;
  extension: '.doc' | '.docx';
};

type PrepareResult = 'converted' | 'copied' | 'skipped' | 'would-convert' | 'would-copy';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const sourceRootDir = resolve(rootDir, 'data/source-data/pearls-word');
const preparedRootDir = resolve(rootDir, 'data/word-docx');
const tempRootDir = resolve(rootDir, 'tmp/converted');
const outputBrochuresDirName = 'Брошюры';

const options = parseArgs(process.argv.slice(2));
const allSources = await listWordSources(sourceRootDir);
const sources = dedupeSources(filterSources(allSources, options));
const needsLibreOffice = !options.dryRun && sources.some((source) => source.extension === '.doc');
const sofficePath = needsLibreOffice ? await resolveSofficePath() : null;
const counts: Record<PrepareResult, number> = {
  converted: 0,
  copied: 0,
  skipped: 0,
  'would-convert': 0,
  'would-copy': 0,
};

console.log(`Found ${sources.length} Word brochures`);

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
  `would-convert: ${counts['would-convert']}`,
  `would-copy: ${counts['would-copy']}`,
].join('\n'));

function parseArgs(args: string[]): PrepareOptions {
  const options: PrepareOptions = {
    years: [],
    quarters: [],
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
    '  --quarter <quarter>    Prepare only one quarter folder, e.g. "1-й квартал"',
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

      if (entry.isDirectory() && isBrochuresDir(entry.name)) {
        return listBrochureDirSources(entryPath);
      }

      if (entry.isDirectory()) {
        return listWordSources(entryPath);
      }

      return [];
    }),
  );

  return sources.flat().sort((a, b) => a.sourceRelativePath.localeCompare(b.sourceRelativePath));
}

async function listBrochureDirSources(dirPath: string): Promise<WordSource[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const relativeDirPath = toRelativePath(sourceRootDir, dirPath);
  const [year, quarter] = relativeDirPath.split('/');

  if (!year || !quarter) {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && isSupportedWordFile(entry.name))
    .map((entry) => {
      const sourcePath = resolve(dirPath, entry.name);
      const extension = extname(entry.name).toLowerCase() as '.doc' | '.docx';
      const outputPath = resolve(preparedRootDir, year, quarter, outputBrochuresDirName, `${basename(entry.name, extname(entry.name))}.docx`);

      return {
        sourcePath,
        sourceRelativePath: toRelativePath(rootDir, sourcePath),
        outputPath,
        outputRelativePath: toRelativePath(rootDir, outputPath),
        year,
        quarter,
        extension,
      };
    });
}

function filterSources(sources: WordSource[], options: PrepareOptions): WordSource[] {
  const years = new Set(options.years);
  const quarters = new Set(options.quarters.map(normalizeText));

  return sources.filter((source) => {
    const matchesYear = years.size === 0 || years.has(source.year);
    const matchesQuarter = quarters.size === 0 || quarters.has(normalizeText(source.quarter));

    return matchesYear && matchesQuarter;
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
  if (next.extension === current.extension) {
    return next.sourceRelativePath.localeCompare(current.sourceRelativePath) < 0;
  }

  return next.extension === '.docx';
}

async function prepareDocx(source: WordSource, options: PrepareOptions, sofficePath: string | null): Promise<PrepareResult> {
  if (!options.force && await isOutputFresh(source)) {
    return 'skipped';
  }

  if (options.dryRun) {
    return source.extension === '.doc' ? 'would-convert' : 'would-copy';
  }

  await mkdir(dirname(source.outputPath), { recursive: true });

  if (source.extension === '.docx') {
    await cp(source.sourcePath, source.outputPath, { force: true });

    return 'copied';
  }

  if (!sofficePath) {
    throw new Error('LibreOffice is required to convert .doc files');
  }

  await convertDocToDocx(source, sofficePath);

  return 'converted';
}

async function convertDocToDocx(source: WordSource, sofficePath: string): Promise<void> {
  const tempDir = resolve(tempRootDir, createHash('sha1').update(source.sourceRelativePath).digest('hex').slice(0, 12));
  const convertedPath = resolve(tempDir, `${basename(source.sourcePath, extname(source.sourcePath))}.docx`);

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await execFileAsync(sofficePath, ['--headless', '--convert-to', 'docx', '--outdir', tempDir, source.sourcePath], { cwd: rootDir });
  await access(convertedPath);
  await cp(convertedPath, source.outputPath, { force: true });
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

async function resolveSofficePath(): Promise<string> {
  const candidates = [
    'soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['--version']);

      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('LibreOffice was not found. Install it or make soffice available in PATH.');
}

function isBrochuresDir(value: string): boolean {
  return normalizeText(value) === normalizeText(outputBrochuresDirName);
}

function isSupportedWordFile(fileName: string): boolean {
  if (fileName.startsWith('~$')) {
    return false;
  }

  const extension = extname(fileName).toLowerCase();

  return extension === '.doc' || extension === '.docx';
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

function toRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/');
}
