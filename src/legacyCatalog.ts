import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

export type LegacyCatalogAuthor = {
  name: string;
  href: string | null;
};

export type LegacyCatalogDocument = {
  position: number;
  year: string;
  month: string;
  title: string;
  href: string;
  url: string | null;
  sourceFile: string | null;
  authors: LegacyCatalogAuthor[];
};

export type LegacyCatalogReference = {
  slug: string;
  expectedDocuments: number;
  currentDocument: LegacyCatalogDocument | null;
  documents: LegacyCatalogDocument[];
};

type LegacyLookup = Map<string, LegacyCatalogDocument[]>;

type LegacyLecture = {
  year?: unknown;
  month?: unknown;
  title?: unknown;
  href?: unknown;
  url?: unknown;
  sourceFile?: unknown;
  authors?: unknown;
};

type LegacyAuthor = {
  name?: unknown;
  href?: unknown;
};

export async function loadLegacyCatalogLookup(rootDir: string): Promise<LegacyLookup> {
  const raw = await readFile(resolve(rootDir, 'data/lecture-data-export.json'), 'utf8');
  const parsed = JSON.parse(raw) as { lectures?: unknown };
  const lectures = Array.isArray(parsed.lectures) ? parsed.lectures as LegacyLecture[] : [];
  const bySlug: LegacyLookup = new Map();

  for (const lecture of lectures) {
    const href = readString(lecture.href);
    const title = readString(lecture.title);
    const year = readString(lecture.year);
    const slug = href ? slugFromHref(href) : null;

    if (!slug || !href || !title || !year) {
      continue;
    }

    const documents = bySlug.get(slug) ?? [];

    documents.push({
      position: documents.length + 1,
      year,
      month: readString(lecture.month) ?? '',
      title,
      href,
      url: readString(lecture.url),
      sourceFile: readString(lecture.sourceFile),
      authors: readAuthors(lecture.authors),
    });

    bySlug.set(slug, documents);
  }

  return bySlug;
}

export function getLegacyCatalogReference(
  lookup: LegacyLookup,
  slug: string,
  documentIndex: number,
): LegacyCatalogReference | null {
  const documents = lookup.get(slug);

  if (!documents || documents.length === 0) {
    return null;
  }

  return {
    slug,
    expectedDocuments: documents.length,
    currentDocument: documents[documentIndex] ?? null,
    documents,
  };
}

function readAuthors(value: unknown): LegacyCatalogAuthor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((author) => isRecord(author) ? toLegacyAuthor(author as LegacyAuthor) : null)
    .filter((author): author is LegacyCatalogAuthor => author !== null);
}

function toLegacyAuthor(author: LegacyAuthor): LegacyCatalogAuthor | null {
  const name = readString(author.name);

  if (!name) {
    return null;
  }

  return {
    name,
    href: readString(author.href),
  };
}

function slugFromHref(href: string): string | null {
  const fileName = basename(href);
  const extension = extname(fileName);
  const slug = extension ? fileName.slice(0, -extension.length) : fileName;

  return slug || null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
