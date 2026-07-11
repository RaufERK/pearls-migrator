import 'dotenv/config';

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getLegacyCatalogReference, loadLegacyCatalogLookup } from '../legacyCatalog.js';
import {
  DEFAULT_METADATA_AI_MODEL,
  extractMetadataWithAi,
  isOpenAiUnavailableError,
  type MetadataCandidate,
} from '../metadataAi.js';
import { applyAiMetadata, needsAiMetadataEnrichment } from '../metadataNormalization.js';
import { getSourceRootDir, loadSourceArchiveMap, resolveStoredPath, toRelativePath } from '../sourceArchive.js';
import type { PearlDocument, PearlInnerDocument } from '../types.js';

type CliOptions = {
  file: string | null;
  year: string | null;
  write: boolean;
  force: boolean;
  model: string;
  limit: number | null;
};

type MetadataSnapshot = Pick<PearlInnerDocument, 'documentTitle' | 'documentType' | 'author' | 'creation' | 'pearlPublication'>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const parsedDir = resolve(rootDir, 'data/parsed');
const sourceRootDir = getSourceRootDir(rootDir);
const sourceArchiveMap = loadSourceArchiveMap(sourceRootDir);
const options = parseArgs(process.argv.slice(2));

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for metadata AI enrichment');
}

const files = await resolveJsonFiles(options);
const legacyCatalogLookup = await loadLegacyCatalogLookup(rootDir);
let scannedDocuments = 0;
let skippedDocuments = 0;
let changedDocuments = 0;
let changedFiles = 0;

console.log(options.write ? 'AI metadata enrichment: write mode' : 'AI metadata enrichment: dry-run mode');
console.log(`Model: ${options.model}`);
console.log(`Skip ready titles: ${options.force ? 'off (--force)' : 'on (default)'}`);
console.log(`Files: ${files.length}`);

for (const filePath of files) {
  const raw = await readFile(filePath, 'utf8');
  const document = JSON.parse(raw) as PearlDocument;
  validateLegacyDocumentsCount(document, filePath);
  let fileChanged = false;

  for (let index = 0; index < document.documents.length; index += 1) {
    if (options.limit !== null && scannedDocuments >= options.limit) {
      break;
    }

    const innerDocument = document.documents[index];

    if (!options.force && !needsAiMetadataEnrichment(innerDocument)) {
      skippedDocuments++;
      console.log(`Skip (title ready): ${relativeToRoot(filePath)} document #${index + 1}`);
      continue;
    }

    const before = toMetadataSnapshot(innerDocument);
    const candidate = toMetadataCandidate(document, innerDocument, index);

    scannedDocuments++;

    try {
      const aiMetadata = await extractMetadataWithAi(candidate, {
        apiKey: process.env.OPENAI_API_KEY,
        model: options.model,
      });
      const enriched = applyAiMetadata(innerDocument, aiMetadata, {
        header: candidate.header,
        footer: candidate.footer,
        bodyPreview: candidate.bodyPreview,
      });
      const after = toMetadataSnapshot(enriched);

      if (!sameMetadata(before, after)) {
        document.documents[index] = enriched;
        fileChanged = true;
        changedDocuments++;
        console.log(`\n${relativeToRoot(filePath)} document #${index + 1}`);
        console.log(JSON.stringify({ before, after }, null, 2));
      }
    } catch (error) {
      if (isOpenAiUnavailableError(error)) {
        console.error(`\n${error.message}`);
        process.exitCode = 1;
        process.exit(1);
      }

      console.warn(`Failed: ${relativeToRoot(filePath)} document #${index + 1}: ${toErrorMessage(error)}`);
    }
  }

  if (fileChanged) {
    changedFiles++;

    if (options.write) {
      await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
      console.log(`Saved: ${relativeToRoot(filePath)}`);
    }
  }

  if (options.limit !== null && scannedDocuments >= options.limit) {
    break;
  }
}

console.log([
  `\nDone: ${scannedDocuments} documents sent to AI`,
  `${skippedDocuments} skipped (title already ready)`,
  `${changedDocuments} documents changed`,
  `${changedFiles} files ${options.write ? 'updated' : 'would be updated'}`,
].join(', '));

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    file: null,
    year: null,
    write: false,
    force: false,
    model: DEFAULT_METADATA_AI_MODEL,
    limit: null,
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

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length);
      continue;
    }

    if (arg === '--file') {
      options.file = readNextArg(args, index, '--file');
      index++;
      continue;
    }

    if (arg.startsWith('--year=')) {
      options.year = arg.slice('--year='.length);
      continue;
    }

    if (arg === '--year') {
      options.year = readNextArg(args, index, '--year');
      index++;
      continue;
    }

    if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length);
      continue;
    }

    if (arg === '--model') {
      options.model = readNextArg(args, index, '--model');
      index++;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }

    if (arg === '--limit') {
      options.limit = parseLimit(readNextArg(args, index, '--limit'));
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run metadata:ai -- [options]',
    '',
    'Low-level AI-only enrichment (no downloads / seed).',
    'Prefer the operator command: npm run metadata -- --year=2019',
    '',
    'Titles are AI-authoritative. Parser heuristics only prepare structure.',
    'From Russia you MUST run VPN before this command.',
    '',
    'If OpenAI returns 403 / "Country, region, or territory not supported",',
    'the CLI aborts immediately with: ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!',
    'Do not invent titles locally when the model is unavailable.',
    '',
    'Examples:',
    '  npm run metadata -- --year=2019',
    '  npm run metadata:ai -- --year=2019 --write',
    '',
    'By default skips inner documents that already have a usable title.',
    'Pass --force only when you intentionally want to re-ask the model.',
    '',
    'Always scope with --year or --file. See WORK-FLOW.md.',
    '',
    'Options:',
    '  --file <path>       Process one parsed JSON file',
    '  --year <year>       Process data/parsed/<year>',
    '  --model <model>     OpenAI model, default gpt-5.4-mini',
    '  --limit <count>     Stop after N AI calls (skipped docs do not count)',
    '  --write             Write changes to JSON files',
    '  --force             Call the model even when a title is already ready',
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

function parseLimit(value: string): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Invalid --limit value: ${value}`);
  }

  return limit;
}

async function resolveJsonFiles(options: CliOptions): Promise<string[]> {
  if (options.file) {
    const filePath = isAbsolute(options.file) ? options.file : resolve(rootDir, options.file);
    return [filePath];
  }

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

function validateLegacyDocumentsCount(document: PearlDocument, filePath: string): void {
  const legacyCatalog = getLegacyCatalogReference(legacyCatalogLookup, document.slug, 0);

  if (!legacyCatalog || legacyCatalog.expectedDocuments === document.documents.length) {
    return;
  }

  console.warn([
    `Legacy catalog mismatch: ${relativeToRoot(filePath)}`,
    `parsed documents: ${document.documents.length}`,
    `legacy documents: ${legacyCatalog.expectedDocuments}`,
  ].join(', '));
}

function toMetadataCandidate(document: PearlDocument, innerDocument: PearlInnerDocument, index: number): MetadataCandidate {
  const header = cleanAnalysisLines(innerDocument.parts.header, document.sitePublication);
  const bodyPreview = cleanAnalysisLines(innerDocument.parts.body.slice(0, 3).map((paragraph) => paragraph.text), document.sitePublication)
    .filter((line) => !looksLikeWeakTitle(line));

  return {
    sourcePdf: document.sourcePdf,
    sourceWord: document.sourceWord ?? null,
    sourceFileName: document.sourceWord ? basename(document.sourceWord) : null,
    sourceMap: getSourceMapMetadata(document.sourceWord),
    jsonPath: document.jsonPath,
    documentIndex: index + 1,
    sitePublication: document.sitePublication,
    current: cleanMetadataSnapshotForAi(toMetadataSnapshot(innerDocument)),
    legacyCatalog: getLegacyCatalogReference(legacyCatalogLookup, document.slug, index),
    header,
    footer: innerDocument.parts.footer.map((paragraph) => paragraph.text),
    bodyPreview,
  };
}

function getSourceMapMetadata(sourceWord: string | undefined): MetadataCandidate['sourceMap'] {
  if (!sourceWord || !sourceArchiveMap) {
    return null;
  }

  const normalizedSourceWord = sourceWord.split('\\').join('/').normalize('NFC');
  const absoluteSourceWord = resolveStoredPath(rootDir, normalizedSourceWord);
  const sourceRelativePath = toRelativePath(sourceRootDir, absoluteSourceWord).normalize('NFC');
  const legacySourcePath = normalizedSourceWord
    .replace(/^\.\//u, '')
    .replace(/^\.\.\/SOURCE_PERALS\//u, '')
    .replace(/^data\/source-data\/pearls-word\//u, '')
    .replace(/^data\/source-data\//u, '');
  const item = sourceArchiveMap.items.find((mapItem) => (
    mapItem.newPath === sourceRelativePath
    || mapItem.oldPath === sourceRelativePath
    || mapItem.newPath === legacySourcePath
    || mapItem.oldPath === legacySourcePath
  ));

  return item
    ? {
      originalName: item.originalName,
      oldPath: item.oldPath,
      newPath: item.newPath,
    }
    : null;
}

function cleanMetadataSnapshotForAi(snapshot: MetadataSnapshot): MetadataSnapshot {
  return {
    ...snapshot,
    documentTitle: looksLikeWeakTitle(snapshot.documentTitle) ? null : snapshot.documentTitle,
    author: {
      ...snapshot.author,
      name: isAnalysisNoiseLine(snapshot.author.name) ? null : snapshot.author.name,
      raw: isAnalysisNoiseLine(snapshot.author.raw) ? null : snapshot.author.raw,
    },
  };
}

function cleanAnalysisLines(lines: string[], sitePublication: PearlDocument['sitePublication']): string[] {
  return lines
    .map((line) => normalizeAnalysisLine(line))
    .filter((line): line is string => line !== null)
    .filter((line) => !isAnalysisNoiseLine(line, sitePublication));
}

function normalizeAnalysisLine(value: string | null): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? null;

  return normalized && normalized.length > 0 ? normalized : null;
}

function isAnalysisNoiseLine(value: string | null, sitePublication?: PearlDocument['sitePublication']): boolean {
  const normalized = normalizeAnalysisLine(value);

  if (!normalized) {
    return true;
  }

  if (/^["«]?\(?избранные\s+учения\)?["»]?$/iu.test(normalized)) {
    return true;
  }

  if (/^\*+$/u.test(normalized) || /Жемчужин[аыеуой]+\s+Мудрости/iu.test(normalized)) {
    return true;
  }

  if (sitePublication?.label && normalized === sitePublication.label) {
    return true;
  }

  if (sitePublication?.rawLabel && normalized === sitePublication.rawLabel) {
    return true;
  }

  return /^[А-ЯЁа-яё]+\s+(?:19|20)\d{2}$/u.test(normalized);
}

function looksLikeWeakTitle(value: string | null): boolean {
  const normalized = normalizeAnalysisLine(value);

  if (!normalized) {
    return true;
  }

  const wordCount = normalized.split(/\s+/u).length;

  return isAnalysisNoiseLine(normalized)
    || /^\(?\s*часть\s+[IVXLCDM\d\s]+\)?$/iu.test(normalized)
    || /^ПРИЗЫВ(?![\p{L}\p{N}])/iu.test(normalized)
    || /^Сегодня(?![\p{L}\p{N}])/iu.test(normalized)
    || /,$/u.test(normalized)
    || normalized.length > 150
    || (wordCount > 18 && /[.!?]$/u.test(normalized));
}

function toMetadataSnapshot(document: PearlInnerDocument): MetadataSnapshot {
  return {
    documentTitle: document.documentTitle,
    documentType: document.documentType,
    author: document.author,
    creation: document.creation,
    pearlPublication: document.pearlPublication,
  };
}

function sameMetadata(first: MetadataSnapshot, second: MetadataSnapshot): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function relativeToRoot(filePath: string): string {
  return filePath.startsWith(rootDir) ? filePath.slice(rootDir.length + 1) : filePath;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
