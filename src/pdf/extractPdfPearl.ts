import { relative, resolve, sep } from 'node:path';

import type { PearlDocument } from '../types.js';
import { buildPearlDocumentFromParagraphs } from '../word/extractWordPearl.js';
import { extractPdfLines, pdfLinesToParagraphs } from './extractPdfLines.js';

export type ExtractPdfPearlOptions = {
  sourcePdf: string;
  jsonPath: string;
  parsedAt?: string;
  rootDir?: string;
};

export async function extractPdfPearlDocument(
  sourcePdfPath: string,
  options: ExtractPdfPearlOptions,
): Promise<PearlDocument> {
  const rootDir = options.rootDir ?? process.cwd();
  const absoluteSourcePath = resolve(sourcePdfPath);
  const extracted = await extractPdfLines(absoluteSourcePath);
  const paragraphs = pdfLinesToParagraphs(extracted.lines)
    .filter((paragraph) => paragraph.text.length > 0);
  const sourceRelativePath = toProjectRelativePath(rootDir, absoluteSourcePath);

  return buildPearlDocumentFromParagraphs(paragraphs, {
    sourcePath: sourceRelativePath,
    jsonPath: options.jsonPath,
    parsedAt: options.parsedAt,
    layout: extracted.layout,
    pages: extracted.pageCount,
    evidence: paragraphs.slice(0, 12).map((paragraph) => paragraph.text),
  });
}

function toProjectRelativePath(rootDir: string, absolutePath: string): string {
  return relative(rootDir, absolutePath).split(sep).join('/');
}
