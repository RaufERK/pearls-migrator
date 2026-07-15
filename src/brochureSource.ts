import { access, readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import {
  getPreparedRootDir,
  getSourceRootDir,
  isCanonicalBrochureStem,
  sourceMailingPdfDirName,
  sourcePrintPdfDirName,
  sourceWordDirName,
  toCanonicalQuarterName,
} from './sourceArchive.js';

export type BrochureSourceExtension = '.doc' | '.docx' | '.pdf';

export type BrochureSource = {
  slug: string;
  year: string;
  quarterNumber: number;
  quarter: string;
  sourcePath: string;
  sourceRelativePath: string;
  extension: BrochureSourceExtension;
  preparedDocxPath: string;
  preparedDocxRelativePath: string;
  parsedJsonPath: string;
};

const SLUG_PATTERN = /^(?:19|20)\d{2}Q[1-4]-[1-3]$/u;

export function parseBrochureSlug(value: string): { slug: string; year: string; quarterNumber: number } {
  const slug = value.trim();

  if (!SLUG_PATTERN.test(slug) || !isCanonicalBrochureStem(slug)) {
    throw new Error(`Invalid brochure slug: ${value}. Expected e.g. 2011Q4-1`);
  }

  const match = /^(?<year>(?:19|20)\d{2})Q(?<quarter>[1-4])-(?<month>[1-3])$/u.exec(slug);

  if (!match?.groups) {
    throw new Error(`Invalid brochure slug: ${value}`);
  }

  return {
    slug,
    year: match.groups.year,
    quarterNumber: Number(match.groups.quarter),
  };
}

export async function resolveBrochureSource(rootDir: string, slugInput: string): Promise<BrochureSource> {
  const { slug, year, quarterNumber } = parseBrochureSlug(slugInput);
  const quarter = toCanonicalQuarterName(quarterNumber);
  const sourceRootDir = getSourceRootDir(rootDir);
  const quarterDirs = await listExistingQuarterDirs(sourceRootDir, year, quarterNumber);
  const candidates = await collectSourceCandidates(quarterDirs, slug);

  const preferred = pickPreferredSource(candidates);

  if (!preferred) {
    throw new Error(
      `No source found for ${slug}. Looked for ${slug}.docx/.doc/.pdf under word/, pdf-mailing/, pdf-print/ in ${year}/${quarter}`,
    );
  }

  const preparedDocxPath = resolve(getPreparedRootDir(rootDir), year, quarter, sourceWordDirName, `${slug}.docx`);
  const parsedJsonPath = resolve(rootDir, 'data/parsed', year, `${slug}.json`);

  return {
    slug,
    year,
    quarterNumber,
    quarter,
    sourcePath: preferred.path,
    sourceRelativePath: toRelativePath(rootDir, preferred.path),
    extension: preferred.extension,
    preparedDocxPath,
    preparedDocxRelativePath: toRelativePath(rootDir, preparedDocxPath),
    parsedJsonPath,
  };
}

type SourceCandidate = {
  path: string;
  extension: BrochureSourceExtension;
  rank: number;
};

async function collectSourceCandidates(quarterDirs: string[], slug: string): Promise<SourceCandidate[]> {
  const candidates: SourceCandidate[] = [];

  for (const quarterDir of quarterDirs) {
    const wordDirs = await listWordSourceDirs(quarterDir);

    for (const wordDir of wordDirs) {
      candidates.push(
        ...await existingCandidates(wordDir, slug, [
          { extension: '.docx', rank: 1 },
          { extension: '.doc', rank: 2 },
          { extension: '.pdf', rank: 3 },
        ]),
      );
    }

    const mailingDirs = await listMailingPdfDirs(quarterDir);

    for (const mailingDir of mailingDirs) {
      candidates.push(...await existingCandidates(mailingDir, slug, [{ extension: '.pdf', rank: 4 }]));
    }

    for (const printDir of [join(quarterDir, sourcePrintPdfDirName), join(quarterDir, 'Печать')]) {
      candidates.push(...await existingCandidates(printDir, slug, [{ extension: '.pdf', rank: 5 }]));
    }
  }

  return candidates;
}

async function existingCandidates(
  dirPath: string,
  slug: string,
  specs: Array<{ extension: BrochureSourceExtension; rank: number }>,
): Promise<SourceCandidate[]> {
  if (!(await pathExists(dirPath))) {
    return [];
  }

  const found: SourceCandidate[] = [];

  for (const spec of specs) {
    const path = join(dirPath, `${slug}${spec.extension}`);

    if (await pathExists(path)) {
      found.push({ path, extension: spec.extension, rank: spec.rank });
    }
  }

  return found;
}

function pickPreferredSource(candidates: SourceCandidate[]): SourceCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return left.path.localeCompare(right.path);
  })[0] ?? null;
}

async function listExistingQuarterDirs(sourceRootDir: string, year: string, quarterNumber: number): Promise<string[]> {
  const candidates = [
    resolve(sourceRootDir, year, toCanonicalQuarterName(quarterNumber)),
    resolve(sourceRootDir, year, `${quarterNumber}-й квартал`),
    resolve(sourceRootDir, year, `${quarterNumber}-и квартал`),
  ];
  const existing = await Promise.all(candidates.map(async (candidate) => (await pathExists(candidate) ? [candidate] : [])));

  return existing.flat();
}

async function listWordSourceDirs(quarterDir: string): Promise<string[]> {
  const entries = await readdir(quarterDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && isWordSourceDir(entry.name))
    .map((entry) => resolve(quarterDir, entry.name));
}

async function listMailingPdfDirs(quarterDir: string): Promise<string[]> {
  const entries = await readdir(quarterDir, { withFileTypes: true });

  return [
    join(quarterDir, sourceMailingPdfDirName),
    ...entries
      .filter((entry) => entry.isDirectory() && entry.name.normalize('NFC').toLowerCase().startsWith('рассылка'))
      .map((entry) => join(quarterDir, entry.name)),
  ];
}

function isWordSourceDir(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('ru-RU');

  return normalized === sourceWordDirName
    || normalized === 'брошюры'
    || normalized === 'брошюра';
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

function toRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/');
}
