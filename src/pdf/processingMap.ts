import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

export type PdfColumnCount = 1 | 2;

export type PdfProcessingEntry = {
  columns?: PdfColumnCount;
  showOriginal?: boolean;
  expectedDocuments?: number;
  sourceOverride?: string;
  notes?: string;
};

export type PdfProcessingMap = {
  defaultsByYear?: Record<string, PdfProcessingEntry>;
  files?: Record<string, PdfProcessingEntry>;
};

const mapPath = resolve(process.cwd(), 'data/pdf-processing-map.json');

export async function readPdfProcessingMap(): Promise<PdfProcessingMap> {
  try {
    return JSON.parse(await readFile(mapPath, 'utf8')) as PdfProcessingMap;
  } catch (error) {
    if (isNotFoundError(error)) {
      return {};
    }

    throw error;
  }
}

export async function writePdfProcessingMap(map: PdfProcessingMap): Promise<void> {
  await writeFile(mapPath, `${JSON.stringify(sortProcessingMap(map), null, 2)}\n`, 'utf8');
}

export function getPdfProcessingEntry(map: PdfProcessingMap, sourcePdf: string): PdfProcessingEntry {
  const year = parseSourceYear(sourcePdf);
  const defaultEntry = year ? map.defaultsByYear?.[String(year)] : undefined;
  const fileEntry = map.files?.[normalizeSourcePdf(sourcePdf)];

  return {
    ...defaultEntry,
    ...fileEntry,
  };
}

export function normalizeSourcePdf(sourcePdf: string): string {
  return sourcePdf.replace(/\\/g, '/').replace(/^.*?pearls\//u, 'pearls/');
}

export function resolveSourceOverridePath(sourceOverride: string): string {
  return resolve(process.cwd(), sourceOverride);
}

export function toSourcePdfFromPath(sourcePath: string): string {
  return normalizeSourcePdf(sourcePath);
}

export function upsertPdfProcessingEntry(map: PdfProcessingMap, sourcePdf: string, entry: PdfProcessingEntry): PdfProcessingMap {
  return {
    ...map,
    files: {
      ...(map.files ?? {}),
      [normalizeSourcePdf(sourcePdf)]: {
        ...(map.files?.[normalizeSourcePdf(sourcePdf)] ?? {}),
        ...entry,
      },
    },
  };
}

function parseSourceYear(sourcePdf: string): number | null {
  const match = normalizeSourcePdf(sourcePdf).match(/^pearls\/((?:19|20)\d{2})\//u);

  return match ? Number(match[1]) : null;
}

function sortProcessingMap(map: PdfProcessingMap): PdfProcessingMap {
  return {
    defaultsByYear: map.defaultsByYear
      ? Object.fromEntries(Object.entries(map.defaultsByYear).sort(([a], [b]) => a.localeCompare(b)))
      : undefined,
    files: map.files
      ? Object.fromEntries(Object.entries(map.files).sort(([a], [b]) => a.localeCompare(b)))
      : undefined,
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'ENOENT';
}

export function toPdfMapKey(sourcePdf: string): string {
  const normalized = normalizeSourcePdf(sourcePdf);
  const ext = extname(normalized);

  return ext ? normalized : `${normalized}/${basename(normalized)}`;
}
