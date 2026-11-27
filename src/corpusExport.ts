import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { normalizeAuthorDisplayName } from './catalogLabels.js';
import { listParsedJsonFiles, toPearlData } from './catalogRows.js';
import { readPearlDocument } from './catalog.js';
import { CORPUS_FORMAT, CorpusManifestSchema, CorpusRecordSchema, type CorpusManifest, type CorpusRecord } from './corpusRecord.js';
import { numberedParagraphs } from './paragraphContract.js';

export const EXPECTED_CORPUS_PEARLS = 252;
export const EXPECTED_CORPUS_DOCUMENTS = 321;
export const EXPECTED_CORPUS_PARAGRAPHS = 34796;

export async function loadCorpusRecords(rootDir: string): Promise<CorpusRecord[]> {
  const parsedDir = resolve(rootDir, 'data/parsed');
  const jsonPaths = await listParsedJsonFiles(parsedDir);
  const records: CorpusRecord[] = [];

  for (const jsonPath of jsonPaths) {
    const document = await readPearlDocument(jsonPath);
    const pearl = toPearlData(document, jsonPath, rootDir);

    for (const innerDocument of pearl.documents.create) {
      records.push(toCorpusRecord(pearl, innerDocument));
    }
  }

  records.sort(compareCorpusRecords);

  return records;
}

export function corpusCounts(records: CorpusRecord[]): { pearls: number; documents: number; paragraphs: number } {
  return {
    pearls: new Set(records.map((record) => record.slug)).size,
    documents: records.length,
    paragraphs: records.reduce((sum, record) => sum + record.paragraphsCount, 0),
  };
}

export function selectSampleRecords(records: CorpusRecord[], pearlCount: number): CorpusRecord[] {
  const slugs: string[] = [];

  for (const record of records) {
    if (!slugs.includes(record.slug)) {
      slugs.push(record.slug);
    }

    if (slugs.length === pearlCount) {
      break;
    }
  }

  const selected = new Set(slugs);

  return records.filter((record) => selected.has(record.slug));
}

export function corpusStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z');
}

export async function writeCorpusExport(options: {
  records: CorpusRecord[];
  directory: string;
  createdAt: Date;
  filePrefix?: string;
}): Promise<CorpusManifest> {
  const prefix = options.filePrefix ?? 'corpus';
  const stamp = corpusStamp(options.createdAt);
  const fileName = `${prefix}-${stamp}.ndjson.gz`;
  const ndjson = options.records.map((record) => JSON.stringify(record)).join('\n') + (options.records.length > 0 ? '\n' : '');
  const gzipped = gzipSync(Buffer.from(ndjson, 'utf8'));
  const counts = corpusCounts(options.records);
  const manifest = CorpusManifestSchema.parse({
    format: CORPUS_FORMAT,
    createdAt: options.createdAt.toISOString(),
    file: fileName,
    sha256: createHash('sha256').update(gzipped).digest('hex'),
    pearls: counts.pearls,
    documents: counts.documents,
    paragraphs: counts.paragraphs,
  });

  await mkdir(options.directory, { recursive: true });
  await writeFile(resolve(options.directory, fileName), gzipped);
  await writeFile(resolve(options.directory, `${prefix}-${stamp}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

function toCorpusRecord(
  pearl: ReturnType<typeof toPearlData>,
  document: ReturnType<typeof toPearlData>['documents']['create'][number],
): CorpusRecord {
  const paragraphs = numberedParagraphs(document.content);

  return CorpusRecordSchema.parse({
    slug: pearl.slug,
    siteYear: pearl.siteYear,
    siteMonth: pearl.siteMonth,
    siteLabel: pearl.siteLabel,
    siteSortDate: pearl.siteSortDate,
    pearlTitle: pearl.title,
    position: document.position,
    documentTitle: document.documentTitle,
    documentType: document.documentType,
    description: document.description,
    authorName: document.authorName,
    authorDisplayName: normalizeAuthorDisplayName(document.authorName),
    authorSlug: document.authorSlug,
    creationDate: toIsoDate(document.creationDate),
    creationYear: document.creationYear,
    creationRaw: document.creationRaw,
    content: document.content,
    paragraphsCount: paragraphs.length,
  });
}

function compareCorpusRecords(left: CorpusRecord, right: CorpusRecord): number {
  return left.siteSortDate.localeCompare(right.siteSortDate)
    || left.slug.localeCompare(right.slug)
    || left.position - right.position;
}

function toIsoDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}
