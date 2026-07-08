import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';

export type SourceFileFormat = 'word' | 'pdf-mailing' | 'pdf-print' | 'originals';

export type SourceMapItem = {
  oldPath: string;
  newPath: string;
  year: number | null;
  quarter: number | null;
  month: number | null;
  format: SourceFileFormat;
  originalName: string;
  extension: string;
  size: number;
  sha256: string;
};

export type SourceArchiveMap = {
  schemaVersion: 1;
  generatedAt: string;
  sourceRoot: string;
  items: SourceMapItem[];
};

export type SourcePathParts = {
  year: number | null;
  quarter: number | null;
};

export const sourceWordDirName = 'word';
export const sourceMailingPdfDirName = 'pdf-mailing';
export const sourcePrintPdfDirName = 'pdf-print';
export const sourceOriginalsDirName = 'originals';

export function getSourceRootDir(rootDir: string): string {
  if (process.env.PEARLS_SOURCE_ROOT) {
    return resolve(process.env.PEARLS_SOURCE_ROOT);
  }

  const siblingSourceRoot = resolve(rootDir, '../SOURCE_PERALS');

  if (existsSync(siblingSourceRoot)) {
    return siblingSourceRoot;
  }

  return resolve(rootDir, 'data/source-data');
}

export function getPreparedRootDir(rootDir: string): string {
  return resolve(rootDir, 'data/word-docx');
}

export function getSourceMapPath(sourceRootDir: string): string {
  return resolve(sourceRootDir, 'source-map.json');
}

export function loadSourceArchiveMap(sourceRootDir: string): SourceArchiveMap | null {
  const mapPath = getSourceMapPath(sourceRootDir);

  if (!existsSync(mapPath)) {
    return null;
  }

  return JSON.parse(readFileSync(mapPath, 'utf8')) as SourceArchiveMap;
}

export function toSlashPath(value: string): string {
  return value.split(sep).join('/');
}

export function toRelativePath(from: string, to: string): string {
  return toSlashPath(relative(from, to));
}

export function toStoredPath(rootDir: string, path: string): string {
  return toRelativePath(rootDir, path);
}

export function resolveStoredPath(rootDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}

export function toCanonicalQuarterName(quarter: number): string {
  return `Q${quarter}`;
}

export function parseSourcePathParts(value: string): SourcePathParts {
  const normalizedPath = value.split('\\').join('/').normalize('NFC');
  const parts = normalizedPath.split('/');
  const yearIndex = parts.findIndex((part) => /^(?:19|20)\d{2}$/u.test(part));
  const year = yearIndex >= 0 ? Number(parts[yearIndex]) : null;
  const quarter = parts.map(parseQuarterSegment).find((partQuarter): partQuarter is number => partQuarter !== null) ?? null;

  return {
    year,
    quarter,
  };
}

export function parseQuarterSegment(value: string): number | null {
  const normalized = value.normalize('NFC').trim();
  const canonicalMatch = /^Q([1-4])$/iu.exec(normalized);

  if (canonicalMatch) {
    return Number(canonicalMatch[1]);
  }

  const legacyMatch = /^([1-4])-[йи]\s+квартал$/iu.exec(normalized);

  if (legacyMatch) {
    return Number(legacyMatch[1]);
  }

  const looseLegacyMatch = /(?:^|\s)([1-4])\s*(?:-|й|и)?\s*квартал(?:\s|$)/iu.exec(normalized);

  return looseLegacyMatch ? Number(looseLegacyMatch[1]) : null;
}

export function sourceMapOverrideCandidates(sourceWord: string, rootDir: string, sourceRootDir: string): string[] {
  const normalizedPath = sourceWord.split('\\').join('/').normalize('NFC');
  const candidates = new Set([
    normalizedPath,
    normalizedPath.replace('data/source-data/', 'data/source-data/pearls-word/'),
    normalizedPath.replace('data/source-data/pearls-word/', 'data/source-data/'),
  ]);
  const archiveMap = loadSourceArchiveMap(sourceRootDir);

  if (!archiveMap) {
    return [...candidates];
  }

  const absolutePath = resolveStoredPath(rootDir, normalizedPath);
  const sourceRelativePath = toRelativePath(sourceRootDir, absolutePath).normalize('NFC');
  const mapItem = archiveMap.items.find((item) => item.newPath === sourceRelativePath || item.oldPath === sourceRelativePath);

  if (!mapItem) {
    return [...candidates];
  }

  for (const path of [
    mapItem.oldPath,
    mapItem.newPath,
    `data/source-data/${mapItem.oldPath}`,
    `data/source-data/pearls-word/${mapItem.oldPath}`,
    `data/source-data/${mapItem.newPath}`,
    `data/source-data/pearls-word/${mapItem.newPath}`,
  ]) {
    candidates.add(path);
  }

  return [...candidates];
}

export function resolveMappedSourcePath(rootDir: string, sourceRootDir: string, path: string): string | null {
  const archiveMap = loadSourceArchiveMap(sourceRootDir);

  if (!archiveMap) {
    return null;
  }

  const normalizedPath = path.split('\\').join('/').normalize('NFC');
  const absolutePath = resolveStoredPath(rootDir, normalizedPath);
  const sourceRelativePath = toRelativePath(sourceRootDir, absolutePath).normalize('NFC');
  const legacySourcePath = normalizedPath
    .replace(/^\.\//u, '')
    .replace(/^data\/source-data\/pearls-word\//u, '')
    .replace(/^data\/source-data\//u, '');
  const mapItem = archiveMap.items.find((item) => (
    item.oldPath === sourceRelativePath
    || item.newPath === sourceRelativePath
    || item.oldPath === legacySourcePath
    || item.newPath === legacySourcePath
  ));

  return mapItem ? resolve(sourceRootDir, mapItem.newPath) : null;
}

export function toSourceStem(path: string): string {
  return basename(path, extname(path));
}
