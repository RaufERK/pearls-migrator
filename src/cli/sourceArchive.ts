import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

import {
  getSourceRootDir,
  loadSourceArchiveMap,
  parseQuarterSegment,
  sourceMailingPdfDirName,
  sourceOriginalsDirName,
  sourcePrintPdfDirName,
  sourceWordDirName,
  toCanonicalQuarterName,
  toRelativePath,
  type SourceArchiveMap,
  type SourceFileFormat,
  type SourceMapItem,
} from '../sourceArchive.js';

type SourceFile = {
  absolutePath: string;
  relativePath: string;
  extension: string;
  size: number;
  sha256: string;
};

type SourceIdentity = {
  year: number | null;
  quarter: number | null;
  month: number | null;
  format: SourceFileFormat;
};

type SourceAudit = {
  generatedAt: string;
  sourceRoot: string;
  filesCount: number;
  directoriesCount: number;
  extensionCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  formatCounts: Record<SourceFileFormat, number>;
  maxPathLength: number;
  longestPaths: string[];
  duplicateBasenames: Record<string, string[]>;
  caseConflicts: Record<string, string[]>;
};

const rootDir = process.cwd();
const sourceRootDir = getSourceRootDir(rootDir);
const sourceAuditPath = resolve(sourceRootDir, 'source-audit.json');
const sourceMapPath = resolve(sourceRootDir, 'source-map.json');
const mode = process.argv[2] ?? 'audit';

if (!['audit', 'map', 'normalize'].includes(mode)) {
  console.error('Usage: npm run source:audit | source:map | source:normalize');
  process.exit(1);
}

async function main(): Promise<void> {
  const files = await listSourceFiles(sourceRootDir);
  const directoriesCount = await countDirectories(sourceRootDir);
  const audit = buildAudit(files, directoriesCount);

  await writeJson(sourceAuditPath, audit);
  console.log(`Wrote ${toRelativePath(rootDir, sourceAuditPath)}`);

  if (mode === 'map' || mode === 'normalize') {
    const existingSourceMap = mode === 'normalize' ? loadSourceArchiveMap(sourceRootDir) : null;
    const sourceMap = existingSourceMap ?? buildSourceMap(files);

    if (existingSourceMap) {
      console.log(`Using ${toRelativePath(rootDir, sourceMapPath)}`);
    } else {
      await writeJson(sourceMapPath, sourceMap);
      console.log(`Wrote ${toRelativePath(rootDir, sourceMapPath)}`);
    }

    if (mode === 'normalize') {
      await applySourceMap(sourceMap);
      await removeEmptyDirectories(sourceRootDir);
      console.log(`Normalized ${sourceMap.items.length} source files`);
    }
  }
}

async function listSourceFiles(dirPath: string): Promise<SourceFile[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return shouldSkipEntry(entry.name) ? [] : listSourceFiles(entryPath);
      }

      if (!entry.isFile() || shouldSkipEntry(entry.name)) {
        return [];
      }

      const fileStat = await stat(entryPath);

      return [{
        absolutePath: entryPath,
        relativePath: toRelativePath(sourceRootDir, entryPath).normalize('NFC'),
        extension: extname(entry.name).toLowerCase(),
        size: fileStat.size,
        sha256: await sha256(entryPath),
      }];
    }),
  );

  return files.flat().sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function countDirectories(dirPath: string): Promise<number> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const childCounts = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory() || shouldSkipEntry(entry.name)) {
        return 0;
      }

      return 1 + await countDirectories(resolve(dirPath, entry.name));
    }),
  );

  return childCounts.reduce((sum, count) => sum + count, 0);
}

function shouldSkipEntry(name: string): boolean {
  return name === '.git' || name === '.DS_Store' || name === 'README.md' || name === 'source-audit.json' || name === 'source-map.json';
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

function buildAudit(files: SourceFile[], directoriesCount: number): SourceAudit {
  const extensionCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  const formatCounts: Record<SourceFileFormat, number> = {
    word: 0,
    'pdf-mailing': 0,
    'pdf-print': 0,
    originals: 0,
  };
  const basenameGroups = new Map<string, string[]>();
  const caseGroups = new Map<string, Set<string>>();

  for (const file of files) {
    const identity = parseSourceIdentity(file.relativePath, file.extension);
    const yearKey = identity.year ? String(identity.year) : 'unknown';
    const basenameKey = basename(file.relativePath).toLocaleLowerCase('ru-RU');

    extensionCounts[file.extension || '[none]'] = (extensionCounts[file.extension || '[none]'] ?? 0) + 1;
    yearCounts[yearKey] = (yearCounts[yearKey] ?? 0) + 1;
    formatCounts[identity.format]++;
    basenameGroups.set(basenameKey, [...(basenameGroups.get(basenameKey) ?? []), file.relativePath]);

    const parts = file.relativePath.split('/');

    for (let index = 0; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join('/');
      const key = `${parent}/${parts[index].toLocaleLowerCase('ru-RU')}`;
      const group = caseGroups.get(key) ?? new Set<string>();

      group.add(parts[index]);
      caseGroups.set(key, group);
    }
  }

  const duplicateBasenames = Object.fromEntries(
    [...basenameGroups.entries()]
      .filter(([, paths]) => paths.length > 1)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const caseConflicts = Object.fromEntries(
    [...caseGroups.entries()]
      .filter(([, names]) => names.size > 1)
      .map(([key, names]): [string, string[]] => [key, [...names].sort()])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const longestPaths = [...files]
    .sort((a, b) => b.relativePath.length - a.relativePath.length)
    .slice(0, 25)
    .map((file) => file.relativePath);

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: sourceRootDir,
    filesCount: files.length,
    directoriesCount,
    extensionCounts: sortRecord(extensionCounts),
    yearCounts: sortRecord(yearCounts),
    formatCounts,
    maxPathLength: longestPaths[0]?.length ?? 0,
    longestPaths,
    duplicateBasenames,
    caseConflicts,
  };
}

function buildSourceMap(files: SourceFile[]): SourceArchiveMap {
  const usedPaths = new Set<string>();
  const items = files.map((file) => {
    const identity = parseSourceIdentity(file.relativePath, file.extension);
    const newPath = buildUniqueCanonicalPath(file, identity, usedPaths);

    return {
      oldPath: file.relativePath,
      newPath,
      year: identity.year,
      quarter: identity.quarter,
      month: identity.month,
      format: identity.format,
      originalName: basename(file.relativePath),
      extension: file.extension,
      size: file.size,
      sha256: file.sha256,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceRoot: sourceRootDir,
    items,
  };
}

function buildUniqueCanonicalPath(file: SourceFile, identity: SourceIdentity, usedPaths: Set<string>): string {
  const year = identity.year ? String(identity.year) : 'archive';
  const quarter = identity.quarter ? toCanonicalQuarterName(identity.quarter) : 'Q0';
  const targetDir = [year, quarter, identity.format].join('/');
  const primaryName = buildPrimaryFileName(file, identity);
  const primaryPath = `${targetDir}/${primaryName}`;

  if (!usedPaths.has(primaryPath.toLocaleLowerCase('ru-RU'))) {
    usedPaths.add(primaryPath.toLocaleLowerCase('ru-RU'));

    return primaryPath;
  }

  const stem = basename(primaryName, file.extension);
  const suffix = toAsciiSlug(basename(file.relativePath, file.extension));
  let index = 2;

  while (true) {
    const candidate = `${targetDir}/${stem}-${suffix || 'copy'}${index > 2 ? `-${index}` : ''}${file.extension}`;
    const key = candidate.toLocaleLowerCase('ru-RU');

    if (!usedPaths.has(key)) {
      usedPaths.add(key);

      return candidate;
    }

    index++;
  }
}

function buildPrimaryFileName(file: SourceFile, identity: SourceIdentity): string {
  if (identity.year && identity.quarter && identity.month) {
    const indexInQuarter = identity.month - ((identity.quarter - 1) * 3);

    if (indexInQuarter >= 1 && indexInQuarter <= 3) {
      return `${identity.year}Q${identity.quarter}-${indexInQuarter}${file.extension}`;
    }
  }

  if (identity.year && identity.month) {
    return `${identity.year}-${pad2(identity.month)}${file.extension}`;
  }

  if (identity.year) {
    return `${identity.year}-${toAsciiSlug(basename(file.relativePath, file.extension)) || 'source'}${file.extension}`;
  }

  return `${toAsciiSlug(basename(file.relativePath, file.extension)) || 'source'}${file.extension}`;
}

function parseSourceIdentity(relativePath: string, extension: string): SourceIdentity {
  const normalizedPath = relativePath.normalize('NFC');
  const parts = normalizedPath.split('/');
  const fileName = basename(normalizedPath, extension);
  const year = extractYear(parts);
  const quarter = extractQuarter(parts);
  const month = extractMonthFromText(normalizedPath)
    ?? extractMonthFromEnglishFolder(parts)
    ?? extractMonthFromQuarterIndex(fileName, quarter)
    ?? extractMonthFromBrochureNumber(fileName, quarter);
  const resolvedQuarter = quarter ?? (month ? Math.ceil(month / 3) : null);

  return {
    year,
    quarter: resolvedQuarter,
    month,
    format: resolvedQuarter ? detectFormat(normalizedPath, extension) : 'originals',
  };
}

function extractYear(parts: string[]): number | null {
  const yearPart = parts.find((part) => /^(?:19|20)\d{2}$/u.test(part));

  return yearPart ? Number(yearPart) : null;
}

function extractQuarter(parts: string[]): number | null {
  for (const part of parts) {
    const quarter = parseQuarterSegment(part);

    if (quarter) {
      return quarter;
    }
  }

  return null;
}

const monthMap: Record<string, number> = {
  январь: 1,
  января: 1,
  january: 1,
  февраль: 2,
  февраля: 2,
  february: 2,
  март: 3,
  марта: 3,
  march: 3,
  апрель: 4,
  апреля: 4,
  april: 4,
  май: 5,
  мая: 5,
  may: 5,
  июнь: 6,
  июня: 6,
  june: 6,
  июль: 7,
  июля: 7,
  july: 7,
  август: 8,
  августа: 8,
  august: 8,
  сентябрь: 9,
  сентября: 9,
  september: 9,
  октябрь: 10,
  октября: 10,
  october: 10,
  ноябрь: 11,
  ноября: 11,
  november: 11,
  декабрь: 12,
  декабря: 12,
  december: 12,
};

const monthPattern = new RegExp(`(?:^|[^\\p{L}])(${Object.keys(monthMap).join('|')})(?=$|[^\\p{L}])`, 'iu');

function extractMonthFromText(value: string): number | null {
  const match = value.toLocaleLowerCase('ru-RU').match(monthPattern);

  return match ? monthMap[match[1]] ?? null : null;
}

function extractMonthFromEnglishFolder(parts: string[]): number | null {
  for (const part of parts) {
    if (!monthPattern.test(part.toLocaleLowerCase('ru-RU'))) {
      continue;
    }

    const match = /^(?:0?([1-9])|1[0-2])[_\s-]/u.exec(part);

    if (match) {
      const month = Number(match[1] ?? part.slice(0, 2));

      if (month >= 1 && month <= 12) {
        return month;
      }
    }
  }

  return null;
}

function extractMonthFromQuarterIndex(fileName: string, quarter: number | null): number | null {
  const slugMatch = /(?:^|[^0-9])(?:19|20)\d{2}Q([1-4])-([1-3])(?:$|[^0-9])/iu.exec(fileName);

  if (slugMatch) {
    return (Number(slugMatch[1]) - 1) * 3 + Number(slugMatch[2]);
  }

  if (!quarter) {
    return null;
  }

  const match = /кв\.\s*([1-3])/iu.exec(fileName);

  return match ? (quarter - 1) * 3 + Number(match[1]) : null;
}

function extractMonthFromBrochureNumber(fileName: string, quarter: number | null): number | null {
  if (!quarter) {
    return null;
  }

  const match = /^(\d{1,2})[_\s-]/u.exec(fileName);
  const brochureNumber = match ? Number(match[1]) : null;

  if (!brochureNumber) {
    return null;
  }

  if (brochureNumber >= 1 && brochureNumber <= 3) {
    return (quarter - 1) * 3 + brochureNumber;
  }

  const quarterStart = (quarter - 1) * 3 + 1;
  const quarterEnd = quarter * 3;

  return brochureNumber >= quarterStart && brochureNumber <= quarterEnd ? brochureNumber : null;
}

function detectFormat(relativePath: string, extension: string): SourceFileFormat {
  const lowerPath = relativePath.toLocaleLowerCase('ru-RU');
  const pathParts = lowerPath.split('/');

  if (pathParts.includes(sourceWordDirName)) return 'word';
  if (pathParts.includes(sourceMailingPdfDirName)) return 'pdf-mailing';
  if (pathParts.includes(sourcePrintPdfDirName)) return 'pdf-print';
  if (pathParts.includes(sourceOriginalsDirName)) return 'originals';
  if (/оригинал|original|исходн|old|архив/u.test(lowerPath)) return 'originals';
  if (extension === '.pdf' && /печать|печат/u.test(lowerPath)) return 'pdf-print';
  if (extension === '.pdf') return 'pdf-mailing';
  if (extension === '.doc' || extension === '.docx') return 'word';

  return 'originals';
}

async function applySourceMap(sourceMap: SourceArchiveMap): Promise<void> {
  const sortedItems = [...sourceMap.items].sort((a, b) => b.oldPath.length - a.oldPath.length);

  for (const item of sortedItems) {
    if (item.oldPath === item.newPath) {
      continue;
    }

    const oldPath = resolve(sourceRootDir, item.oldPath);
    const newPath = resolve(sourceRootDir, item.newPath);

    try {
      await stat(oldPath);
    } catch {
      try {
        await stat(newPath);
        continue;
      } catch {
        throw new Error(`Source file missing before normalize: ${item.oldPath}`);
      }
    }

    await mkdir(dirname(newPath), { recursive: true });
    await rename(oldPath, newPath);
  }
}

async function removeEmptyDirectories(dirPath: string): Promise<boolean> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  let hasEntries = false;

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      hasEntries = true;
      continue;
    }

    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const isEmpty = await removeEmptyDirectories(entryPath);

      if (isEmpty) {
        await rm(entryPath, { recursive: true, force: true });
      } else {
        hasEntries = true;
      }

      continue;
    }

    hasEntries = true;
  }

  return dirPath !== sourceRootDir && !hasEntries;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toAsciiSlug(value: string): string {
  return transliterateRussian(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 48);
}

function transliterateRussian(value: string): string {
  const chars: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return [...value].map((char) => chars[char.toLocaleLowerCase('ru-RU')] ?? char).join('');
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
