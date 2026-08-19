import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type LegacyLectureMetadataAuthor = {
  name: string;
  href?: string;
};

export type LegacyLectureMetadataDocument = {
  title: string;
  lines?: string[];
  href?: string;
};

export type LegacyLectureMetadataEntry = {
  source: string;
  year: number;
  month: number;
  monthLabel: string;
  legacyMonthLabel: string;
  authorsText: string;
  authors: LegacyLectureMetadataAuthor[];
  documentsText: string;
  documents: LegacyLectureMetadataDocument[];
};

type LegacyLectureMetadataMap = {
  version?: number;
  files?: Record<string, LegacyLectureMetadataEntry>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const legacyLectureMetadataMapPath = resolve(rootDir, 'data/legacy-lecture-metadata-map.json');
let cachedLegacyLectureMetadataMap: LegacyLectureMetadataMap | null | undefined;

export function getLegacyLectureMetadataEntry(slug: string): LegacyLectureMetadataEntry | null {
  return getLegacyLectureMetadataMap()?.files?.[slug] ?? null;
}

export function getLegacyLectureMetadataEntries(): Array<LegacyLectureMetadataEntry & { slug: string }> {
  const files = getLegacyLectureMetadataMap()?.files ?? {};

  return Object.entries(files)
    .map(([slug, entry]) => ({ slug, ...entry }))
    .sort((first, second) => first.slug.localeCompare(second.slug));
}

function getLegacyLectureMetadataMap(): LegacyLectureMetadataMap | null {
  if (cachedLegacyLectureMetadataMap !== undefined) {
    return cachedLegacyLectureMetadataMap;
  }

  try {
    cachedLegacyLectureMetadataMap = JSON.parse(readFileSync(legacyLectureMetadataMapPath, 'utf8')) as LegacyLectureMetadataMap;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      cachedLegacyLectureMetadataMap = null;

      return cachedLegacyLectureMetadataMap;
    }

    throw error;
  }

  return cachedLegacyLectureMetadataMap;
}
