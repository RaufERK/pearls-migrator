import { readdir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

import { readPearlDocument } from './catalog.js';
import type { PearlDocument } from './types.js';

export type DownloadCatalogItem = {
  slug: string;
  year: string;
  jsonPath: string;
  sourcePath: string;
};

export async function loadDownloadCatalogFromParsed(
  rootDir: string,
  year?: string | null,
): Promise<DownloadCatalogItem[]> {
  const parsedDir = resolve(rootDir, 'data/parsed');
  const jsonPaths = year
    ? await listJsonFiles(resolve(parsedDir, year))
    : await listJsonFiles(parsedDir);
  const items = await Promise.all(jsonPaths.map(async (jsonPath) => {
    const document = await readPearlDocument(jsonPath);

    return toDownloadCatalogItem(rootDir, jsonPath, document);
  }));

  return items.sort((left, right) => left.slug.localeCompare(right.slug));
}

function toDownloadCatalogItem(rootDir: string, jsonPath: string, document: PearlDocument): DownloadCatalogItem {
  const sourceLabel = document.sourceWord ?? document.sourcePdf;
  const year = String(document.sitePublication.year ?? parseYearFromPath(jsonPath) ?? parseYearFromPath(sourceLabel) ?? 'archive');

  return {
    slug: document.slug,
    year,
    jsonPath,
    sourcePath: resolve(rootDir, sourceLabel),
  };
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

  return files.flat();
}

function shouldReadParsedJson(fileName: string): boolean {
  return extname(fileName) === '.json' && !/_OLD\.json$/iu.test(fileName) && basename(fileName) !== 'package.json';
}

function parseYearFromPath(value: string): number | null {
  const match = value.match(/(?:^|\/)((?:19|20)\d{2})(?:\/|$)/u);

  return match ? Number(match[1]) : null;
}
