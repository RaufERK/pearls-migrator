import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findSourceMapItem,
  getSourceRootDir,
  loadSourceArchiveMap,
  resolveMappedSourcePath,
  toRelativePath,
  type SourceArchiveMap,
} from '../sourceArchive.js';
import type { PearlDocument } from '../types.js';

type CliOptions = {
  year: string | null;
  write: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const parsedDir = resolve(rootDir, 'data/parsed');
const sourceRootDir = getSourceRootDir(rootDir);
const sourceArchiveMap = loadSourceArchiveMap(sourceRootDir);
const options = parseArgs(process.argv.slice(2));

if (!sourceArchiveMap) {
  throw new Error(`source-map.json not found under ${sourceRootDir}`);
}

const files = await resolveJsonFiles(options);
let scannedFiles = 0;
let changedFiles = 0;
let unchangedFiles = 0;
let failedFiles = 0;

console.log(options.write ? 'Remap legacy source paths: write mode' : 'Remap legacy source paths: dry-run mode');
console.log(`Files: ${files.length}`);

for (const filePath of files) {
  scannedFiles += 1;
  const raw = await readFile(filePath, 'utf8');
  const document = JSON.parse(raw) as PearlDocument;
  const nextDocument = remapDocumentPaths(document, sourceArchiveMap);
  const before = JSON.stringify({
    sourcePdf: document.sourcePdf,
    sourceWord: document.sourceWord,
  });
  const after = JSON.stringify({
    sourcePdf: nextDocument.sourcePdf,
    sourceWord: nextDocument.sourceWord,
  });

  if (stillHasLegacySourcePath(nextDocument)) {
    failedFiles += 1;
    console.warn(`Failed to remap: ${toRelativePath(rootDir, filePath)}`);
    console.warn(`  sourceWord: ${document.sourceWord ?? '(none)'}`);
    console.warn(`  sourcePdf:  ${document.sourcePdf}`);
    continue;
  }

  if (before === after) {
    unchangedFiles += 1;
    continue;
  }

  changedFiles += 1;
  console.log(`\n${toRelativePath(rootDir, filePath)}`);
  console.log(`  sourceWord: ${document.sourceWord ?? '(none)'} -> ${nextDocument.sourceWord ?? '(none)'}`);
  console.log(`  sourcePdf:  ${document.sourcePdf} -> ${nextDocument.sourcePdf}`);

  if (options.write) {
    await writeFile(filePath, `${JSON.stringify(nextDocument, null, 2)}\n`, 'utf8');
    console.log('  saved');
  }
}

console.log([
  `\nDone: ${scannedFiles} files scanned`,
  `${changedFiles} would change`,
  `${unchangedFiles} already canonical`,
  `${failedFiles} failed`,
  options.write ? '(written)' : '(dry-run)',
].join(', '));

function remapDocumentPaths(document: PearlDocument, archiveMap: SourceArchiveMap): PearlDocument {
  const sourceWord = remapStoredSourcePath(document.sourceWord, archiveMap) ?? document.sourceWord;
  const sourcePdf = remapStoredSourcePath(document.sourcePdf, archiveMap) ?? document.sourcePdf;

  return {
    ...document,
    sourceWord,
    sourcePdf,
  };
}

function remapStoredSourcePath(path: string | undefined, archiveMap: SourceArchiveMap): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.includes('../SOURCE_PERALS/') || path.startsWith('SOURCE_PERALS/')) {
    return path.startsWith('../SOURCE_PERALS/') ? path : `../${path}`;
  }

  if (!path.includes('data/source-data')) {
    return path;
  }

  const mappedAbsolute = resolveMappedSourcePath(rootDir, sourceRootDir, path);

  if (mappedAbsolute) {
    return toRelativePath(rootDir, mappedAbsolute);
  }

  const legacyKey = path
    .replace(/^\.\//u, '')
    .replace(/^data\/source-data\/pearls-word\//u, '')
    .replace(/^data\/source-data\//u, '');
  const mapItem = findSourceMapItem(archiveMap, [legacyKey]);

  return mapItem ? toRelativePath(rootDir, resolve(sourceRootDir, mapItem.newPath)) : undefined;
}

function stillHasLegacySourcePath(document: PearlDocument): boolean {
  return [document.sourceWord, document.sourcePdf].some((path) => path?.includes('data/source-data'));
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    year: null,
    write: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--write') {
      options.write = true;
      continue;
    }

    if (arg.startsWith('--year=')) {
      options.year = arg.slice('--year='.length);
      continue;
    }

    if (arg === '--year') {
      options.year = readNextArg(args, index, '--year');
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.year !== null && !/^(?:19|20)\d{2}$/u.test(options.year)) {
    throw new Error(`Invalid --year value: ${options.year}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run remap:source-paths -- [options]',
    '',
    'Rewrites legacy data/source-data/... paths in data/parsed JSON to',
    '../SOURCE_PERALS/... using SOURCE_PERALS/source-map.json.',
    'Does not re-parse content — only path fields.',
    '',
    'Options:',
    '  --year <year>       Remap only data/parsed/<year>',
    '  --write             Write changes (default is dry-run)',
    '  --help              Show this help',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

async function resolveJsonFiles(options: CliOptions): Promise<string[]> {
  const sourceDir = options.year ? resolve(parsedDir, options.year) : parsedDir;

  return listJsonFiles(sourceDir);
}

async function listJsonFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }

      return entry.isFile() && shouldReadParsedJson(entry.name) ? [entryPath] : [];
    }),
  );

  return files.flat().sort();
}

function shouldReadParsedJson(fileName: string): boolean {
  return extname(fileName) === '.json' && !/_OLD\.json$/iu.test(fileName);
}
