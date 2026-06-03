import { readFile } from 'node:fs/promises';

import JSZip from 'jszip';

export type DocxTextPart = {
  path: string;
  paragraphs: string[];
};

export type ExtractedDocxText = {
  headers: DocxTextPart[];
  body: DocxTextPart;
  footers: DocxTextPart[];
};

export async function extractDocxText(filePath: string): Promise<ExtractedDocxText> {
  const zip = await JSZip.loadAsync(await readFile(filePath));

  return {
    headers: await extractParts(zip, /^word\/header\d+\.xml$/u),
    body: await extractRequiredPart(zip, 'word/document.xml'),
    footers: await extractParts(zip, /^word\/footer\d+\.xml$/u),
  };
}

async function extractRequiredPart(zip: JSZip, path: string): Promise<DocxTextPart> {
  const file = zip.file(path);

  if (!file) {
    throw new Error(`DOCX part not found: ${path}`);
  }

  return {
    path,
    paragraphs: extractParagraphs(await file.async('string')),
  };
}

async function extractParts(zip: JSZip, pattern: RegExp): Promise<DocxTextPart[]> {
  const paths = Object.keys(zip.files).filter((path) => pattern.test(path)).sort();

  return Promise.all(
    paths.map(async (path) => ({
      path,
      paragraphs: extractParagraphs(await zip.files[path].async('string')),
    })),
  );
}

function extractParagraphs(xml: string): string[] {
  return [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/gu)]
    .map((match) => extractParagraphText(match[0]))
    .map(normalizeText)
    .filter((text) => text.length > 0);
}

function extractParagraphText(paragraphXml: string): string {
  const parts: string[] = [];
  const tokenPattern = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gu;

  for (const match of paragraphXml.matchAll(tokenPattern)) {
    if (match[0].startsWith('<w:tab')) {
      parts.push(' ');
      continue;
    }

    if (match[0].startsWith('<w:br')) {
      parts.push('\n');
      continue;
    }

    parts.push(stripXmlTags(decodeXmlEntities(match[1] ?? '')));
  }

  return parts.join('');
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .trim();
}

function stripXmlTags(value: string): string {
  return value.replace(/<[^>]+>/gu, '');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&');
}
