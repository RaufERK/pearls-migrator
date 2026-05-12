import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join } from 'node:path';

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

const MONTH_MAP: Record<string, number> = {
  январь: 1, января: 1,
  февраль: 2, февраля: 2,
  март: 3, марта: 3,
  апрель: 4, апреля: 4,
  май: 5, мая: 5,
  июнь: 6, июня: 6,
  июль: 7, июля: 7,
  август: 8, августа: 8,
  сентябрь: 9, сентября: 9,
  октябрь: 10, октября: 10,
  ноябрь: 11, ноября: 11,
  декабрь: 12, декабря: 12,
};
const HEADER_SEARCH_LIMIT = 20;
const BODY_LINE_MIN_LENGTH = 45;
const DEFAULT_PDF_PATH = 'pearls/2006/1994_12_25_Morya.pdf';
const DEFAULT_JSON_PATH = 'data/parsed/2006/1994_12_25_Morya.json';
const require = createRequire(import.meta.url);
const pdfjsRootDir = dirname(require.resolve('pdfjs-dist/package.json'));
const standardFontDataUrl = `${join(pdfjsRootDir, 'standard_fonts')}/`;

type ExtractPearlOptions = {
  sourcePdf?: string;
  jsonPath?: string;
  parsedAt?: string;
};

type DocumentDate = {
  year: number;
  month: number | null;
  day: number | null;
  publishedAt: string | null;
  sortDate: string;
};

export async function extractPearlDocument(sourcePath = DEFAULT_PDF_PATH, options: ExtractPearlOptions = {}): Promise<PearlDocument> {
  const pages = await extractPages(sourcePath);
  const lines = pages.flatMap(pageToLines);
  const cleanedLines = lines.filter((line) => !isPageNumber(line.text));
  const { title, subtitle, header, bodyLines, footerLines } = splitDocumentLines(cleanedLines);
  const paragraphs = linesToParagraphs(bodyLines);
  const footer = linesToParagraphs(footerLines).map((paragraph) => ({ text: stripFooterSeparator(paragraph.text) })).filter((paragraph) => paragraph.text.length > 0);
  const layout = pickDocumentLayout(pages);
  const sourcePdf = options.sourcePdf ?? sourcePath;
  const jsonPath = options.jsonPath ?? DEFAULT_JSON_PATH;
  const date = pickDocumentDate(sourcePdf, subtitle);
  const speaker = extractSpeaker(sourcePdf);
  const slug = buildSlug(sourcePdf, date, speaker);
  const allHeaderText = header.join('\n');
  const footerText = footer.map((paragraph) => paragraph.text).join('\n');
  const metadataText = [allHeaderText, footerText].filter(Boolean).join('\n');
  const documentType = extractDocumentType(metadataText);
  const sitePublication = extractSitePublication(subtitle, sourcePdf);
  const creation = extractCreation(footerText, sourcePdf);
  const pearlPublication = extractPearlPublication([...header, ...paragraphs.map((paragraph) => paragraph.text), ...footer.map((paragraph) => paragraph.text)]);
  const author = extractAuthor(header, footerText, speaker, pearlPublication.raw);
  const documentTitle = extractDocumentTitle(header, paragraphs);

  return {
    slug,
    ...date,
    title,
    subtitle,
    speaker,
    documentTitle,
    documentType,
    author,
    sitePublication,
    creation,
    pearlPublication,
    parts: {
      header,
      body: paragraphs,
      footer,
    },
    sourcePdf,
    jsonPath,
    parsedAt: options.parsedAt ?? new Date().toISOString(),
    paragraphs,
    meta: {
      pages: pages.length,
      layout,
    },
  };
}

function pickDocumentDate(sourcePdf: string, subtitle: string[]): DocumentDate {
  const fileDate = parseDateFromFileName(sourcePdf);

  if (fileDate) {
    return toDocumentDate(fileDate.year, fileDate.month, fileDate.day);
  }

  const quarterDate = parseDateFromQuarterFileName(sourcePdf);

  if (quarterDate) {
    return toDocumentDate(quarterDate.year, quarterDate.month, null);
  }

  const subtitleDate = parseDateFromSubtitle(subtitle);

  if (subtitleDate) {
    return toDocumentDate(subtitleDate.year, subtitleDate.month, null);
  }

  const fallbackYear = parseYearFromSourcePath(sourcePdf) ?? new Date().getFullYear();

  return {
    year: fallbackYear,
    month: null,
    day: null,
    publishedAt: null,
    sortDate: `${fallbackYear}-01-01`,
  };
}

function parseDateFromFileName(sourcePdf: string): { year: number; month: number; day: number } | null {
  const fileName = basename(sourcePdf, extname(sourcePdf));
  const match = fileName.match(/(?:^|[^0-9])((?:19|20)\d{2})[_-](\d{1,2})[_-](\d{1,2})(?:[^0-9]|$)/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

function parseDateFromQuarterFileName(sourcePdf: string): { year: number; month: number } | null {
  const fileName = basename(sourcePdf, extname(sourcePdf));
  const match = fileName.match(/^((?:19|20)\d{2})Q([1-4])-(\d)\b/);

  if (!match) {
    return null;
  }

  const quarter = Number(match[2]);
  const indexInQuarter = Number(match[3]);

  if (indexInQuarter < 1 || indexInQuarter > 3) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: (quarter - 1) * 3 + indexInQuarter,
  };
}

function parseDateFromSubtitle(subtitle: string[]): { year: number; month: number } | null {
  for (const line of subtitle) {
    const lower = line.toLowerCase().replace(/\b((?:19|20))\s+(\d{2})\b/g, '$1$2').trim();
    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);

    if (!yearMatch) continue;

    const year = parseInt(yearMatch[0], 10);
    const months: number[] = [];

    for (const [word, num] of Object.entries(MONTH_MAP)) {
      if (lower.includes(word) && !months.includes(num)) {
        months.push(num);
      }
    }

    if (months.length === 0) continue;

    return { year, month: months.sort((a, b) => a - b)[0] };
  }

  return null;
}

function parseYearFromSourcePath(sourcePdf: string): number | null {
  const match = sourcePdf.match(/(?:^|\/)pearls\/((?:19|20)\d{2})(?:\/|$)/);

  return match ? Number(match[1]) : null;
}

function toDocumentDate(year: number, month: number, day: number | null): DocumentDate {
  const sortDate = `${year}-${pad2(month)}-${pad2(day ?? 1)}`;

  return {
    year,
    month,
    day,
    publishedAt: sortDate,
    sortDate,
  };
}

function buildSlug(sourcePdf: string, date: DocumentDate, speaker: string | null): string {
  if (date.day) {
    const speakerSlug = speaker ? `-${toSlugPart(speaker)}` : '';

    return `${date.year}-${pad2(date.month ?? 1)}-${pad2(date.day)}${speakerSlug}`;
  }

  if (date.month && isModernQuarterFile(sourcePdf)) {
    return `${date.year}-${pad2(date.month)}`;
  }

  return toSlugPart(basename(sourcePdf, extname(sourcePdf)));
}

function extractSpeaker(sourcePdf: string): string | null {
  const fileName = basename(sourcePdf, extname(sourcePdf));
  const withoutDate = fileName
    .replace(/^((?:19|20)\d{2})[_-]\d{1,2}[_-]\d{1,2}[_-]?/, '')
    .replace(/^((?:19|20)\d{2})Q[1-4]-\d[_-]?/, '')
    .trim();
  const speaker = withoutDate
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return speaker.length > 0 && speaker !== fileName ? speaker : null;
}

function isModernQuarterFile(sourcePdf: string): boolean {
  return /^((?:19|20)\d{2})Q[1-4]-\d\b/.test(basename(sourcePdf, extname(sourcePdf)));
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toSlugPart(value: string): string {
  return value
    .replace(/&/g, ' and ')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
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

  return mergeBrokenParagraphs(paragraphs.map((text) => ({ text })));
}

// Merges paragraphs that were split by a page or column boundary mid-sentence.
// Heuristic: if a paragraph ends without terminal punctuation and the next one
// starts with a lowercase letter, they belong to the same sentence.
function mergeBrokenParagraphs(paragraphs: { text: string }[]): { text: string }[] {
  const endsWithTerminal = /[.!?…»][»"')]*\s*$/u;
  const startsWithLowercase = /^[а-яёa-z]/u;
  const endsWithHyphen = /-$/;

  const result: { text: string }[] = [];

  for (const para of paragraphs) {
    if (result.length === 0) {
      result.push({ text: para.text });
      continue;
    }

    const last = result[result.length - 1];

    if (endsWithHyphen.test(last.text) && startsWithLowercase.test(para.text)) {
      last.text = last.text.slice(0, -1) + para.text;
    } else if (!endsWithTerminal.test(last.text) && startsWithLowercase.test(para.text)) {
      last.text = `${last.text} ${para.text}`;
    } else {
      result.push({ text: para.text });
    }
  }

  return result;
}

function splitDocumentLines(lines: ExtractedLine[]): {
  title: string;
  subtitle: string[];
  header: string[];
  bodyLines: ExtractedLine[];
  footerLines: ExtractedLine[];
} {
  const texts = lines.map((line) => line.text);
  const bodyStartIndex = findBodyStartIndex(texts);
  const headerLines = texts.slice(0, bodyStartIndex);
  const titleIndex = headerLines.findIndex((line) => line.includes('Жемчужины Мудрости'));
  const title = titleIndex >= 0 ? headerLines[titleIndex] : (headerLines[0] ?? 'Жемчужины Мудрости');
  const rawSubtitle = headerLines.filter((line, index) => index !== titleIndex);
  const subtitle = mergeSubtitleLines(rawSubtitle);
  const contentLines = lines.slice(bodyStartIndex).filter((line) => !isRunningHeaderFooter(line.text));
  const footerStartIndex = findFooterStartIndex(contentLines.map((line) => line.text));
  const bodyAndMaybeHeaderLines = footerStartIndex === null ? contentLines : contentLines.slice(0, footerStartIndex);
  const footerLines = footerStartIndex === null ? [] : contentLines.slice(footerStartIndex);
  const promotedHeaderLines = takeLeadingHeaderLines(bodyAndMaybeHeaderLines);
  const bodyLines = bodyAndMaybeHeaderLines.slice(promotedHeaderLines.length);

  return { title, subtitle, header: [...subtitle, ...promotedHeaderLines.map((line) => line.text)], bodyLines, footerLines };
}

function findBodyStartIndex(lines: string[]): number {
  const limit = Math.min(lines.length, HEADER_SEARCH_LIMIT);

  // A prayer heading marks the invocation prayer - body starts here.
  for (let i = 0; i < limit; i++) {
    if (isBodyStartMarker(lines[i])) return i;
  }

  // For documents without ПРИЗЫВ: body text appears as consecutive long lines
  // (PDF column wrapping produces lines of similar length, unlike short cover metadata)
  for (let i = 2; i < limit - 1; i++) {
    if (lines[i].length >= BODY_LINE_MIN_LENGTH && lines[i + 1].length >= BODY_LINE_MIN_LENGTH) {
      return i;
    }
  }

  return FALLBACK_HEADER_LINE_COUNT;
}

function findFooterStartIndex(lines: string[]): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isFooterSeparatorLine(lines[i])) {
      return i;
    }
  }

  return null;
}

function takeLeadingHeaderLines(lines: ExtractedLine[]): ExtractedLine[] {
  const result: ExtractedLine[] = [];

  for (const line of lines.slice(0, 6)) {
    if (!isLeadingHeaderLine(line.text)) {
      break;
    }

    result.push(line);
  }

  return result;
}

function isLeadingHeaderLine(value: string): boolean {
  const trimmed = value.trim();

  return /^Том\s+\d+\s+№/iu.test(trimmed)
    || /^([IVXLCDM]+|\d+)$/u.test(trimmed)
    || (trimmed.length <= 90 && /(диктовка|лекция|проповедь|медитация|семинар|часть|раздел)/iu.test(trimmed))
    || (trimmed.length <= 90 && /[«"][^»"]+[»"]/.test(trimmed));
}

// Joins subtitle lines that were split by PDF column wrapping mid-sentence.
// A line starting with a lowercase letter continues the previous line.
function mergeSubtitleLines(lines: string[]): string[] {
  const startsWithLowercase = /^[а-яёa-z]/u;
  const result: string[] = [];

  for (const line of lines) {
    if (result.length > 0 && startsWithLowercase.test(line)) {
      result[result.length - 1] += ` ${line}`;
    } else {
      result.push(line);
    }
  }

  return result;
}

function isBodyStartMarker(value: string): boolean {
  const normalized = value.trim().replace(/[.:]+$/u, '').toLowerCase();

  return /^(открывающий\s+)?призыв$/iu.test(normalized)
    || /^молитва$/iu.test(normalized)
    || /^преамбула$/iu.test(normalized);
}

function isFooterSeparatorLine(value: string): boolean {
  return /_{8,}/u.test(value) || /^[-–—]{8,}\s*/u.test(value.trim());
}

function stripFooterSeparator(value: string): string {
  return normalizeSpaces(value.replace(/^[-_–—\s]{8,}/u, ''));
}

function extractDocumentType(text: string): PearlDocument['documentType'] {
  const lower = text.toLowerCase();

  if (lower.includes('диктовка')) return 'dictation';
  if (lower.includes('лекция')) return 'lecture';
  if (lower.includes('проповедь')) return 'sermon';
  if (/(^|\n)\s*(открывающий\s+)?призыв\s*(\n|$)/iu.test(text) || /(^|\n)\s*молитва\s*(\n|$)/iu.test(text)) return 'prayer';

  return 'material';
}

function extractAuthor(header: string[], footerText: string, fallbackSpeaker: string | null, pearlRaw: string | null): PearlDocument['author'] {
  const footerLines = footerText.split('\n').map(normalizeSpaces).filter(Boolean);
  const headerTypeLine = header.find((line) => /(диктовка|лекция|проповедь)/iu.test(line));
  const footerTypeLine = footerLines.find((line) => /(диктовка|лекция|проповедь)/iu.test(line));
  const raw = headerTypeLine && !/[«"][^»"]+[»"]/.test(headerTypeLine) ? headerTypeLine : (pearlRaw ?? headerTypeLine ?? footerTypeLine ?? fallbackSpeaker);
  const name = raw ? cleanAuthorName(raw) : null;

  return {
    name,
    slug: name ? toSlugPart(transliterateRussian(name)) : null,
    raw,
  };
}

function cleanAuthorName(raw: string): string | null {
  if (/^Том\s+\d+\s+№/iu.test(raw)) {
    const dashParts = raw.split(/\s+[–-]\s+/u).map(normalizeSpaces);

    if (dashParts.length >= 3 && dashParts[1]) {
      return dashParts[1];
    }

    const pearlAuthor = raw.match(/^Том\s+\d+\s+№+\s*[\d,\s]+(?:[–-]\s*)?(.+?)(?:\s+[–-]\s*)?\d{1,2}\s+[А-ЯЁа-яё]+\s+(?:19|20)\d{2}/u)?.[1];

    if (pearlAuthor) {
      return normalizeSpaces(pearlAuthor);
    }
  }

  const withoutPearlPrefix = raw.replace(/^Том\s+\d+\s+№+[^–-]*[–-]\s*/iu, '');
  const beforeDate = withoutPearlPrefix.split(/\s+[–-]\s+\d/u)[0];
  const cleaned = beforeDate
    .replace(/^(Диктовка|Лекция|Проповедь)[-\s]*/iu, '')
    .replace(/(была|был|дана|дан|через|Посланника|Великого|Белого|Братства).*$/iu, '')
    .replace(/\s+[«"].*$/u, '')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function extractSitePublication(subtitle: string[], sourcePdf: string): PearlDocument['sitePublication'] {
  const sourceYear = parseYearFromSourcePath(sourcePdf);
  const label = sourceYear ? subtitle.slice(0, 5).find((line) => parsePublicationMonths(line, sourceYear)) ?? null : null;
  const parsed = sourceYear && label ? parsePublicationMonths(label, sourceYear) : null;

  if (parsed && sourceYear && label) {
    return {
      label: normalizeYearSpaces(label),
      year: sourceYear,
      month: parsed.months[0] ?? null,
      months: parsed.months.map((month) => `${sourceYear}-${pad2(month)}`),
      sortDate: parsed.months[0] ? `${sourceYear}-${pad2(parsed.months[0])}-01` : null,
    };
  }

  const fallback = parseDateFromQuarterFileName(sourcePdf);

  if (fallback && (!sourceYear || fallback.year === sourceYear)) {
    return {
      label: null,
      year: fallback.year,
      month: fallback.month,
      months: [`${fallback.year}-${pad2(fallback.month)}`],
      sortDate: `${fallback.year}-${pad2(fallback.month)}-01`,
    };
  }

  return {
    label: null,
    year: sourceYear,
    month: null,
    months: [],
    sortDate: sourceYear ? `${sourceYear}-01-01` : null,
  };
}

function parsePublicationMonths(value: string, sourceYear: number): { months: number[] } | null {
  const normalized = normalizeYearSpaces(value).toLowerCase();
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/);

  if (!yearMatch || Number(yearMatch[0]) !== sourceYear) {
    return null;
  }

  const months = Object.entries(MONTH_MAP)
    .filter(([word]) => normalized.includes(word))
    .map(([, month]) => month)
    .filter((month, index, all) => all.indexOf(month) === index)
    .sort((a, b) => a - b);

  return months.length > 0 ? { months } : null;
}

function looksLikePublicationLine(value: string): boolean {
  const normalized = normalizeYearSpaces(value).toLowerCase();
  const hasYear = /\b(19|20)\d{2}\b/u.test(normalized);
  const hasMonth = Object.keys(MONTH_MAP).some((word) => normalized.includes(word));

  return hasYear && hasMonth;
}

function normalizeYearSpaces(value: string): string {
  return value.replace(/\b([12])\s*(\d)\s*(\d)\s*(\d)\b/gu, '$1$2$3$4');
}

function extractCreation(footerText: string, sourcePdf: string): PearlDocument['creation'] {
  const parsed = parseRussianDate(footerText);

  if (parsed) {
    return {
      date: parsed.date,
      year: parsed.year,
      raw: footerText || null,
    };
  }

  const fileDate = parseDateFromFileName(sourcePdf);

  if (fileDate) {
    return {
      date: `${fileDate.year}-${pad2(fileDate.month)}-${pad2(fileDate.day)}`,
      year: fileDate.year,
      raw: footerText || null,
    };
  }

  return {
    date: null,
    year: parseYearFromSourcePath(sourcePdf),
    raw: footerText || null,
  };
}

function extractPearlPublication(lines: string[]): PearlDocument['pearlPublication'] {
  const raw = lines.find((line) => /^Том\s+\d+\s+№/iu.test(line)) ?? null;

  if (!raw) {
    return {
      volume: null,
      issue: null,
      date: null,
      rawDate: null,
      raw: null,
    };
  }

  const volumeMatch = raw.match(/^Том\s+(\d+)/iu);
  const issueMatch = raw.match(/№+\s*([\d,\s]+)/iu);
  const dateMatch = raw.match(/(\d{1,2}(?:\s*,\s*\d{1,2})?\s+[А-ЯЁа-яё]+\s+(?:19|20)\d{2}\s*г?\.?)/u);
  const parsedDate = dateMatch ? parseRussianDate(dateMatch[1]) : parseRussianDate(raw);

  return {
    volume: volumeMatch ? Number(volumeMatch[1]) : null,
    issue: issueMatch ? normalizeSpaces(issueMatch[1]) : null,
    date: parsedDate?.date ?? null,
    rawDate: dateMatch ? normalizeSpaces(dateMatch[1]) : null,
    raw,
  };
}

function parseRussianDate(value: string): { date: string; year: number } | null {
  const normalized = normalizeYearSpaces(value.toLowerCase()).replace(/\b(\d)\s+(\d)\s+([а-яё]+)\s+((?:19|20)\d{2})\b/gu, '$1$2 $3 $4');
  const match = normalized.match(/(\d{1,2})(?:\s*,\s*\d{1,2})?\s+([а-яё]+)\s+((?:19|20)\d{2})/u);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = MONTH_MAP[match[2]];
  const year = Number(match[3]);

  if (!month || !isValidDateParts(year, month, day)) {
    return null;
  }

  return {
    date: `${year}-${pad2(month)}-${pad2(day)}`,
    year,
  };
}

function extractDocumentTitle(header: string[], paragraphs: { text: string }[]): string | null {
  const candidates = [...header, ...paragraphs.slice(0, 4).map((paragraph) => paragraph.text)];
  const quoted = candidates.map((line) => line.match(/[«"]([^»"]+)[»"]/u)?.[1]).find(Boolean);

  if (quoted) {
    return normalizeSpaces(quoted);
  }

  const candidate = candidates.find((line) => !line.includes('Жемчужины Мудрости')
    && !looksLikePublicationLine(line)
    && !/(диктовка|лекция|проповедь)/iu.test(line)
    && !/^Том\s+\d+\s+№/iu.test(line));

  return candidate ? normalizeSpaces(candidate) : null;
}

function transliterateRussian(value: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  return value
    .toLowerCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('');
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
