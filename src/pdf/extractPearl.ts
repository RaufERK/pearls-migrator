import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import type { ExtractedLine, PdfLayout, PearlDocument } from '../types.js';

type PdfTextItem = {
  str: string;
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
};

type PositionedTextItem = {
  page: number;
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type PageText = {
  page: number;
  width: number;
  height: number;
  layout: PdfLayout;
  splitX: number;
  items: PositionedTextItem[];
};

const FALLBACK_HEADER_LINE_COUNT = 5;
const DEFAULT_PDF_PATH = 'pearls/2006/1994_12_25_Morya.pdf';
const require = createRequire(import.meta.url);
const pdfjsRootDir = dirname(require.resolve('pdfjs-dist/package.json'));
const standardFontDataUrl = `${join(pdfjsRootDir, 'standard_fonts')}/`;

export async function extractPearlDocument(sourcePath = DEFAULT_PDF_PATH): Promise<PearlDocument> {
  const pages = await extractPages(sourcePath);
  const lines = pages.flatMap(pageToLines);
  const cleanedLines = lines.filter((line) => !isPageNumber(line.text));
  const { title, subtitle, bodyLines } = splitDocumentLines(cleanedLines);
  const paragraphs = linesToParagraphs(bodyLines);
  const layout = pickDocumentLayout(pages);

  return {
    sourcePath,
    title,
    subtitle,
    paragraphs,
    meta: {
      pages: pages.length,
      layout,
    },
  };
}

async function extractPages(sourcePath: string): Promise<PageText[]> {
  const buffer = await readFile(sourcePath);
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    standardFontDataUrl,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;
  const pages: PageText[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const textItems = content.items as unknown[];
    const items = textItems
      .filter(isPdfTextItem)
      .map((item) => {
        const [, b, , d, x, y] = item.transform;

        return {
          page: pageNumber,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
          x,
          y,
          width: item.width,
          height: Math.max(item.height, Math.hypot(b, d)),
          text: normalizeSpaces(item.str),
        };
      });
    const { layout, splitX } = detectPageLayout(items, viewport.width, viewport.height);

    pages.push({
      page: pageNumber,
      width: viewport.width,
      height: viewport.height,
      layout,
      splitX,
      items,
    });
  }

  return pages;
}

function detectPageLayout(
  items: PositionedTextItem[],
  pageWidth: number,
  pageHeight: number,
): { layout: PdfLayout; splitX: number } {
  const xs = items
    .filter((item) => item.text.length > 2)
    .map((item) => item.x)
    .sort((a, b) => a - b);

  if (xs.length < 20 || pageWidth <= pageHeight * 1.1) {
    return { layout: 'single-column', splitX: pageWidth / 2 };
  }

  const minX = pageWidth * 0.08;
  const maxX = pageWidth * 0.92;
  const candidates = xs.filter((x) => x > minX && x < maxX);
  let bestGap = 0;
  let splitX = pageWidth / 2;

  for (let index = 1; index < candidates.length; index += 1) {
    const gap = candidates[index] - candidates[index - 1];

    if (gap > bestGap) {
      bestGap = gap;
      splitX = candidates[index - 1] + gap / 2;
    }
  }

  const leftCount = items.filter((item) => item.x < splitX).length;
  const rightCount = items.filter((item) => item.x >= splitX).length;
  const hasTwoColumns = bestGap > pageWidth * 0.06 && leftCount > 20 && rightCount > 20;

  return {
    layout: hasTwoColumns ? 'two-column' : 'single-column',
    splitX: hasTwoColumns ? splitX : pageWidth / 2,
  };
}

function pageToLines(page: PageText): ExtractedLine[] {
  const columns = page.layout === 'two-column' ? [0, 1] : [0];

  return columns.flatMap((column) => {
    const columnItems = page.items
      .filter((item) => page.layout === 'single-column' || (column === 0 ? item.x < page.splitX : item.x >= page.splitX))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    return groupItemsIntoLines(columnItems, page.page, column);
  });
}

function groupItemsIntoLines(items: PositionedTextItem[], page: number, column: number): ExtractedLine[] {
  const lines: PositionedTextItem[][] = [];

  for (const item of items) {
    const line = lines.find((candidate) => Math.abs(candidate[0].y - item.y) <= Math.max(2.5, item.height * 0.45));

    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((itemsOnLine) => {
      const sorted = itemsOnLine.sort((a, b) => a.x - b.x);
      const first = sorted[0];

      return {
        page,
        column,
        x: first.x,
        y: first.y,
        height: Math.max(...sorted.map((item) => item.height)),
        text: normalizeSpaces(sorted.map((item) => item.text).join(' ')),
      };
    })
    .filter((line) => line.text.length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);
}

function linesToParagraphs(lines: ExtractedLine[]) {
  const paragraphs: string[] = [];
  let current = '';
  let previous: ExtractedLine | undefined;

  for (const line of lines) {
    const newBlock = previous ? shouldStartParagraph(previous, line) : true;

    if (newBlock && current) {
      paragraphs.push(current);
      current = '';
    }

    current = appendLine(current, line.text);
    previous = line;
  }

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs.map((text) => ({ text }));
}

function splitDocumentLines(lines: ExtractedLine[]): { title: string; subtitle: string[]; bodyLines: ExtractedLine[] } {
  const texts = lines.map((line) => line.text);
  const bodyStartIndex = findBodyStartIndex(texts);
  const headerLines = texts.slice(0, bodyStartIndex);
  const titleIndex = headerLines.findIndex((line) => line.includes('Жемчужины Мудрости'));
  const title = titleIndex >= 0 ? headerLines[titleIndex] : (headerLines[0] ?? 'Жемчужины Мудрости');
  const subtitle = headerLines.filter((line, index) => index !== titleIndex);
  const bodyLines = lines.slice(bodyStartIndex).filter((line) => !isRunningHeaderFooter(line.text));

  return { title, subtitle, bodyLines };
}

function findBodyStartIndex(lines: string[]): number {
  const callIndex = lines.findIndex((line) => line === 'ПРИЗЫВ');

  if (callIndex >= 0) {
    return callIndex;
  }

  const addressIndex = lines.findIndex((line, index) => index > 1 && line.endsWith('!'));

  return addressIndex >= 0 ? addressIndex : FALLBACK_HEADER_LINE_COUNT;
}

function shouldStartParagraph(previous: ExtractedLine, current: ExtractedLine): boolean {
  if (previous.page !== current.page || previous.column !== current.column) {
    return true;
  }

  const verticalGap = Math.abs(previous.y - current.y);
  const expectedGap = Math.max(previous.height, current.height) * 1.55;
  const isIndented = current.x - previous.x > 9;

  return verticalGap > expectedGap || isIndented;
}

function appendLine(current: string, next: string): string {
  if (!current) {
    return next;
  }

  if (current.endsWith('-') && /^[а-яёa-z]/u.test(next)) {
    return `${current.slice(0, -1)}${next}`;
  }

  return `${current} ${next}`;
}

function pickDocumentLayout(pages: PageText[]): PdfLayout {
  const twoColumnPages = pages.filter((page) => page.layout === 'two-column').length;

  return twoColumnPages > pages.length / 2 ? 'two-column' : 'single-column';
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isPageNumber(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function isRunningHeaderFooter(value: string): boolean {
  return /^-- \d+ of \d+ --$/.test(value) || /^[А-ЯЁа-яё]+ \d{4}$/.test(value);
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const candidate = item as Partial<PdfTextItem>;

  return typeof candidate.str === 'string' && candidate.str.trim().length > 0 && Array.isArray(candidate.transform);
}
