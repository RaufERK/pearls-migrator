import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';

import type { PearlCatalogItem, PearlDocument } from './types.js';

const parsedDirName = 'data/parsed';

export async function loadPearlCatalog(rootDir: string): Promise<PearlCatalogItem[]> {
  const parsedDir = resolve(rootDir, parsedDirName);
  const jsonPaths = await listJsonFiles(parsedDir);
  const items = await Promise.all(
    jsonPaths.map(async (jsonPath) => {
      const document = await readPearlDocument(jsonPath);
      const slug = toSlug(jsonPath);
      const year = getPublicationYear(rootDir, jsonPath, document);
      const path = `/pearls/${year}/${slug}`;

      return {
        slug,
        year,
        path,
        jsonPath,
        sourcePath: document.sourcePath,
        sourceLabel: toSourceLabel(rootDir, document.sourcePath),
        title: document.title,
        subtitle: document.subtitle.join(' · '),
        description: toDescription(document),
        pages: document.meta.pages,
        paragraphs: document.paragraphs.length,
        layout: document.meta.layout,
        downloads: {
          txt: `/downloads/${year}/${slug}.txt`,
          docx: `/downloads/${year}/${slug}.docx`,
          epub: `/downloads/${year}/${slug}.epub`,
        },
      };
    }),
  );

  return items.sort((left, right) => right.path.localeCompare(left.path, 'ru'));
}

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}

async function listJsonFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function toSlug(jsonPath: string): string {
  return basename(jsonPath, extname(jsonPath))
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getPublicationYear(rootDir: string, jsonPath: string, document: PearlDocument): string {
  const sourceParts = relative(rootDir, document.sourcePath).split(sep);
  const pearlsIndex = sourceParts.indexOf('pearls');

  if (pearlsIndex >= 0 && sourceParts[pearlsIndex + 1]) {
    return sourceParts[pearlsIndex + 1];
  }

  const parsedParts = relative(resolve(rootDir, parsedDirName), dirname(jsonPath)).split(sep);

  if (/^\d{4}$/.test(parsedParts[0] ?? '')) {
    return parsedParts[0];
  }

  const yearFromSubtitle = document.subtitle.join(' ').match(/\b(19|20)\d{2}\b/)?.[0];

  return yearFromSubtitle ?? 'archive';
}

function toSourceLabel(rootDir: string, sourcePath: string): string {
  const relativePath = relative(rootDir, sourcePath);

  return relativePath.startsWith('..') ? basename(sourcePath) : relativePath;
}

function toDescription(document: PearlDocument): string {
  const text = document.paragraphs.find((paragraph) => paragraph.text.trim().length > 80)?.text ?? document.subtitle.join('. ');

  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}
