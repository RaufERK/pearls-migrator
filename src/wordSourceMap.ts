import { access, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeSourceText } from './sourcePublication.js';

export type WordSourceMapEntry = {
  sourceWord: string;
  notes?: string;
};

type WordSourceMap = {
  version?: number;
  description?: string;
  files?: Record<string, WordSourceMapEntry>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const wordSourceMapPath = resolve(rootDir, 'data/word-source-map.json');
let cachedWordSourceMap: WordSourceMap | null | undefined;

export function getWordSourceMapEntry(slug: string): WordSourceMapEntry | null {
  return getWordSourceMap()?.files?.[slug] ?? null;
}

export function getWordSourceMapEntries(): Array<WordSourceMapEntry & { slug: string }> {
  const files = getWordSourceMap()?.files ?? {};

  return Object.entries(files)
    .map(([slug, entry]) => ({ slug, ...entry }))
    .sort((first, second) => first.slug.localeCompare(second.slug));
}

export async function resolveMappedSourcePath(projectRootDir: string, sourceWord: string): Promise<string> {
  const directPath = resolve(projectRootDir, sourceWord);

  try {
    await access(directPath);

    return directPath;
  } catch {
    return resolveUnicodeEquivalentPath(projectRootDir, sourceWord);
  }
}

function getWordSourceMap(): WordSourceMap | null {
  if (cachedWordSourceMap !== undefined) {
    return cachedWordSourceMap;
  }

  try {
    cachedWordSourceMap = JSON.parse(readFileSync(wordSourceMapPath, 'utf8')) as WordSourceMap;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      cachedWordSourceMap = null;

      return cachedWordSourceMap;
    }

    throw error;
  }

  return cachedWordSourceMap;
}

async function resolveUnicodeEquivalentPath(projectRootDir: string, relativePath: string): Promise<string> {
  const parts = relativePath.split('/').filter(Boolean);
  let currentPath = projectRootDir;

  for (const part of parts) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    const entry = entries.find((candidate) => normalizeSourceText(candidate.name) === normalizeSourceText(part));

    if (!entry) {
      throw new Error(`Mapped source path not found: ${relativePath}`);
    }

    currentPath = resolve(currentPath, entry.name);
  }

  await access(currentPath);

  return currentPath;
}
