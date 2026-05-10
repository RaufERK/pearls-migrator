import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { PearlCatalogItem, PearlDocument } from './types.js';

const parsedDirName = 'data/parsed';

export async function loadPearlCatalog(rootDir: string): Promise<PearlCatalogItem[]> {
  const parsedDir = resolve(rootDir, parsedDirName);
  const jsonPaths = await listJsonFiles(parsedDir);
  const items = await Promise.all(
    jsonPaths.map(async (jsonPath) => {
      const document = await readPearlDocument(jsonPath);
      const slug = document.slug;
      const year = String(document.year);
      const path = `/pearls/${year}/${slug}`;

      return {
        slug,
        year,
        path,
        jsonPath,
        sourcePath: resolve(rootDir, document.sourcePdf),
        sourceLabel: document.sourcePdf,
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

function toDescription(document: PearlDocument): string {
  const text = document.paragraphs.find((paragraph) => paragraph.text.trim().length > 80)?.text ?? document.subtitle.join('. ');

  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}
