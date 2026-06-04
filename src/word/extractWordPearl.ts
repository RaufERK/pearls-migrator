import { basename, extname } from 'node:path';

import type {
  AuthorMetadata,
  CreationMetadata,
  DocumentType,
  Paragraph,
  PearlDocument,
  PearlInnerDocument,
  PearlPublication,
  SitePublication,
} from '../types.js';
import { extractDocxText } from './extractDocxText.js';

type ExtractWordPearlOptions = {
  sourceWord: string;
  preparedDocx: string;
  jsonPath: string;
  parsedAt?: string;
};

type InnerDocumentSegment = {
  header: string[];
  body: Paragraph[];
  footer: Paragraph[];
};

type SourcePublicationParts = {
  year: number | null;
  quarter: number | null;
  month: number | null;
  rawLabel: string | null;
};

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

const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export async function extractWordPearlDocument(preparedDocxPath: string, options: ExtractWordPearlOptions): Promise<PearlDocument> {
  const extracted = await extractDocxText(preparedDocxPath);
  const bodyParagraphs = extracted.body.paragraphs.map(normalizeSpaces).filter((paragraph) => paragraph.length > 0 && !isPageNumber(paragraph));
  const segments = splitIntoInnerDocumentSegments(bodyParagraphs);
  const documents = segments.map((segment) => buildInnerDocument(segment, options.sourceWord));
  const sitePublication = extractSitePublication(options.sourceWord, [
    ...bodyParagraphs.slice(0, 8),
    ...extracted.headers.flatMap((part) => part.paragraphs),
    ...extracted.footers.flatMap((part) => part.paragraphs),
  ]);
  const slug = buildSlug(options.sourceWord, sitePublication);

  return {
    slug,
    title: buildPearlTitle(sitePublication),
    sitePublication,
    documentsCount: documents.length,
    documents,
    sourcePdf: options.sourceWord,
    sourceWord: options.sourceWord,
    preparedDocx: options.preparedDocx,
    jsonPath: options.jsonPath,
    parsedAt: options.parsedAt ?? new Date().toISOString(),
    meta: {
      pages: extractPageCount(extracted.footers.flatMap((part) => part.paragraphs)),
      layout: 'single-column',
    },
  };
}

function splitIntoInnerDocumentSegments(paragraphs: string[]): InnerDocumentSegment[] {
  const bodyStartIndex = findBodyStartIndex(paragraphs);
  const rootHeader = paragraphs.slice(0, bodyStartIndex).filter((paragraph) => !isPageNumber(paragraph));
  const segments: InnerDocumentSegment[] = [];
  let current: InnerDocumentSegment = {
    header: rootHeader,
    body: [],
    footer: [],
  };
  let expectsNextHeader = false;
  let collectsHeader = false;

  for (const paragraph of paragraphs.slice(bodyStartIndex)) {
    if (isPageNumber(paragraph) || isRunningPublicationLine(paragraph)) {
      continue;
    }

    if (isFooterAttributionLine(paragraph)) {
      current.footer.push({ text: paragraph });
      expectsNextHeader = true;
      collectsHeader = false;
      continue;
    }

    if (isPearlPublicationLine(paragraph) && current.body.length === 0 && current.footer.length === 0) {
      current.header.push(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if ((expectsNextHeader || current.body.length > 0 || current.footer.length > 0) && isPearlPublicationLine(paragraph)) {
      segments.push(current);
      current = createInnerDocumentSegment(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if (expectsNextHeader && isDocumentHeadingLine(paragraph)) {
      segments.push(current);
      current = createInnerDocumentSegment(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if (collectsHeader && isInnerHeaderContinuationLine(paragraph, current.header)) {
      current.header.push(paragraph);
      continue;
    }

    expectsNextHeader = false;
    collectsHeader = false;
    current.body.push({ text: paragraph });
  }

  segments.push(current);

  return segments.filter((segment) => segment.header.length > 0 || segment.body.length > 0 || segment.footer.length > 0);
}

function createInnerDocumentSegment(headerLine: string): InnerDocumentSegment {
  return {
    header: [headerLine],
    body: [],
    footer: [],
  };
}

function findBodyStartIndex(paragraphs: string[]): number {
  const limit = Math.min(paragraphs.length, 14);
  const typeIndex = paragraphs.slice(0, limit).findIndex(isDocumentHeadingLine);

  if (typeIndex >= 0 && typeIndex + 2 < paragraphs.length) {
    return typeIndex + 2;
  }

  for (let index = 0; index < limit; index += 1) {
    const paragraph = paragraphs[index];

    if (!isCoverMetadataLine(paragraph) && paragraph.length >= 45) {
      return index;
    }
  }

  return Math.min(4, paragraphs.length);
}

function buildInnerDocument(segment: InnerDocumentSegment, sourceWord: string): PearlInnerDocument {
  const metadataText = [
    ...segment.header,
    ...segment.footer.map((paragraph) => paragraph.text),
  ].join('\n');
  const pearlPublication = extractPearlPublication([
    ...segment.header,
    ...segment.body.map((paragraph) => paragraph.text),
    ...segment.footer.map((paragraph) => paragraph.text),
  ]);
  const author = extractAuthor(segment.header, metadataText, sourceWord, pearlPublication.raw);

  return {
    documentTitle: extractDocumentTitle(segment.header, segment.body, segment.footer),
    documentType: extractDocumentType(metadataText),
    author,
    creation: extractCreation(segment.footer.map((paragraph) => paragraph.text).join('\n'), sourceWord),
    pearlPublication,
    parts: segment,
  };
}

function extractSitePublication(sourceWord: string, docxEvidence: string[]): SitePublication {
  const sourceParts = extractSourcePublicationParts(sourceWord);
  const year = sourceParts.year ?? extractYearFromText(docxEvidence.join('\n'));
  const month = sourceParts.month ?? extractMonthFromText(docxEvidence.join('\n'));

  if (year && month) {
    const label = `${MONTH_LABELS[month - 1]} ${year}`;

    return {
      label,
      rawLabel: sourceParts.rawLabel,
      year,
      month,
      months: [`${year}-${pad2(month)}`],
      sortDate: `${year}-${pad2(month)}-01`,
    };
  }

  return {
    label: year ? String(year) : null,
    rawLabel: sourceParts.rawLabel,
    year,
    month: null,
    months: [],
    sortDate: year ? `${year}-01-01` : null,
  };
}

function extractSourcePublicationParts(sourceWord: string): SourcePublicationParts {
  const normalizedPath = sourceWord.split('\\').join('/').normalize('NFC');
  const fileName = basename(normalizedPath, extname(normalizedPath));
  const yearMatch = normalizedPath.match(/(?:^|\/)((?:19|20)\d{2})(?:\/|$)/u);
  const quarterMatch = normalizedPath.match(/(?:^|\/)([1-4])-[йи]\s+квартал(?:\/|$)/iu);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const quarter = quarterMatch ? Number(quarterMatch[1]) : null;
  const month = extractMonthFromText(fileName) ?? extractMonthFromQuarterIndex(fileName, quarter);
  const rawLabel = year && month ? `${MONTH_LABELS[month - 1].toLocaleLowerCase('ru-RU')} ${year}` : null;

  return {
    year,
    quarter,
    month,
    rawLabel,
  };
}

function extractMonthFromQuarterIndex(fileName: string, quarter: number | null): number | null {
  if (!quarter) {
    return null;
  }

  const match = fileName.match(/кв\.\s*([1-3])/iu);

  if (!match) {
    return null;
  }

  return (quarter - 1) * 3 + Number(match[1]);
}

function buildSlug(sourceWord: string, sitePublication: SitePublication): string {
  const sourceParts = extractSourcePublicationParts(sourceWord);

  if (sitePublication.year && sourceParts.quarter && sitePublication.month) {
    const indexInQuarter = sitePublication.month - ((sourceParts.quarter - 1) * 3);

    if (indexInQuarter >= 1 && indexInQuarter <= 3) {
      return `${sitePublication.year}Q${sourceParts.quarter}-${indexInQuarter}`;
    }
  }

  return [
    sitePublication.year ?? 'word',
    toSlugPart(transliterateRussian(basename(sourceWord, extname(sourceWord)))),
  ].join('-');
}

function buildPearlTitle(sitePublication: SitePublication): string {
  return sitePublication.label ? `Жемчужины Мудрости. ${sitePublication.label}` : 'Жемчужины Мудрости';
}

function extractDocumentType(text: string): DocumentType {
  const lower = text.toLowerCase();

  if (lower.includes('диктовка')) return 'dictation';
  if (/курс\s+лекций/iu.test(lower)) return 'lectureCourse';
  if (lower.includes('проповедь')) return 'sermon';
  if (/(^|\s)учения(\s|$)/iu.test(lower)) return 'teaching';
  if (lower.includes('лекция')) return 'lecture';
  if (/(^|\n)\s*(открывающий\s+)?призыв\s*(\n|$)/iu.test(text) || /(^|\n)\s*молитва\s*(\n|$)/iu.test(text)) return 'prayer';

  return 'material';
}

function extractAuthor(header: string[], metadataText: string, sourceWord: string, pearlRaw: string | null): AuthorMetadata {
  const headerTypeLine = header.find((line) => /(диктовка|лекция|курс\s+лекций|семинар|учения|проповедь)/iu.test(line));
  const footerMessenger = /Элизабет\s+Клэр\s+Профет/iu.test(metadataText) ? 'Элизабет Клэр Профет' : null;
  const raw = pearlRaw ?? headerTypeLine ?? footerMessenger ?? extractAuthorRawFromFileName(sourceWord);
  const name = raw ? cleanAuthorName(raw) : null;

  return {
    name,
    slug: name ? toSlugPart(transliterateRussian(name)) : null,
    raw,
  };
}

function extractAuthorRawFromFileName(sourceWord: string): string | null {
  const fileName = basename(sourceWord, extname(sourceWord));
  const match = fileName.match(/(?:Диктовка|Лекция|Лекции|Курс\s+лекций|Семинар|Учения|Проповедь)\s+([^'_]+?)(?:\s+['"]|$)/iu);

  return match ? normalizeSpaces(match[0]) : null;
}

function cleanAuthorName(raw: string): string | null {
  if (/(Марк[аом]?|Марком)\s+Л\.?\s+Профет[аом]?/iu.test(raw)) {
    return 'Марк Л. Профет';
  }

  if (/(Э\.?\s*К\.?\s*Профет|Элизабет\s+Клэр\s+Профет)/iu.test(raw)) {
    return 'Элизабет Клэр Профет';
  }

  if (isPearlPublicationLine(raw)) {
    const dashParts = raw.split(/\s+[–-]\s+/u).map(normalizeSpaces);

    if (dashParts.length >= 3 && dashParts[1]) {
      return normalizeAuthorCase(dashParts[1]);
    }
  }

  const cleaned = normalizeAuthorCase(raw
    .replace(/^(Диктовка|Лекция|Лекции|Курс\s+лекций|Семинар|Проповедь)[-\s]*/iu, '')
    .replace(/(была|был|даны|дана|дан|через|Посланника|прочитана|прочитан).*$/iu, '')
    .replace(/\s+[«"].*$/u, '')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim());

  return cleaned.length > 0 && cleaned.length <= 100 ? cleaned : null;
}

function normalizeAuthorCase(value: string): string {
  return value
    .replace(/^возлюбленн(?:ый|ая|ого|ую)\s+/iu, '')
    .replace(/^Вознесенной\s+Владычицы\s+Нады(?=\s|$)/u, 'Вознесенная Владычица Нада')
    .replace(/^Эль\s+Мории(?=\s|$)/u, 'Эль Мория')
    .replace(/^Сурии\s+и\s+Куско(?=\s|$)/u, 'Сурия и Куско')
    .replace(/^Богини(?=\s|$)/u, 'Богиня')
    .replace(/^Бога\s+Гармонии(?=\s|$)/u, 'Бог Гармония')
    .replace(/^Архангела\s+Иофиила(?=\s|$)/u, 'Архангел Иофиил')
    .replace(/^Сераписа\s+Бея(?=\s|$)/u, 'Серапис Бей')
    .replace(/^Господа\s+Майтрейи(?=\s|$)/u, 'Господь Майтрейя')
    .replace(/^Архангела\s+Михаила(?=\s|$)/u, 'Архангел Михаил');
}

function extractCreation(metadataText: string, sourceWord: string): CreationMetadata {
  const parsed = parseRussianDate(metadataText);

  return {
    date: parsed?.date ?? null,
    year: parsed?.year ?? extractSourcePublicationParts(sourceWord).year,
    raw: metadataText || null,
  };
}

function extractPearlPublication(lines: string[]): PearlPublication {
  const raw = lines.find(isPearlPublicationLine) ?? null;

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

function extractDocumentTitle(header: string[], body: Paragraph[], footer: Paragraph[]): string | null {
  const bodyPartTitle = extractBodyPartTitle(body);

  if (bodyPartTitle) {
    return bodyPartTitle;
  }

  const headerPartLine = header.map(parsePartLine).find((part): part is string => part !== null);
  const headingLine = header.find(isDocumentHeadingLine);

  if (headingLine && headerPartLine && /^(Курс\s+лекций|Семинар|Учения)/iu.test(headingLine)) {
    return `${normalizeSpaces(headingLine)} (${headerPartLine})`;
  }

  const headerCandidates = header.filter(isDocumentTitleCandidate);
  const headerQuoted = headerCandidates.map((line) => line.match(/[«"]([^»"]+)[»"]/u)?.[1]).find(Boolean);
  const partLine = body.map((paragraph) => parsePartLine(paragraph.text)).find((part): part is string => part !== null);

  if (headerQuoted) {
    const title = normalizeSpaces(headerQuoted);

    return partLine ? `${title} (${partLine})` : title;
  }

  const headerTitle = joinHeaderTitleLines(headerCandidates);

  if (headerTitle) {
    return normalizeSpaces(headerTitle);
  }

  const footerQuoted = footer.map((paragraph) => paragraph.text.match(/[«"]([^»"]+)[»"]/u)?.[1]).find(Boolean);

  if (footerQuoted) {
    return normalizeSpaces(footerQuoted);
  }

  return headingLine ? normalizeSpaces(headingLine) : null;
}

function joinHeaderTitleLines(lines: string[]): string | null {
  if (lines.length === 0) {
    return null;
  }

  const firstLine = lines[0];
  const nextLine = lines[1];

  if (nextLine && /^[а-яё]/u.test(nextLine.trim())) {
    return [firstLine, nextLine].join(' ');
  }

  return firstLine;
}

function extractBodyPartTitle(body: Paragraph[]): string | null {
  const partLine = parsePartLine(body[0]?.text ?? '');
  const titleLine = body[1]?.text ?? null;

  if (!partLine || !titleLine || !isDocumentTitleCandidate(titleLine)) {
    return null;
  }

  return `${normalizeSpaces(titleLine)} (${partLine})`;
}

function parsePartLine(value: string): string | null {
  const match = value.trim().match(/^\(?часть\s+([IVXLCDM\d\s]+)\)?$/iu);

  if (!match) {
    return null;
  }

  return `Часть ${match[1].replace(/\s+/g, '').toUpperCase()}`;
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

function extractYearFromText(value: string): number | null {
  const match = normalizeYearSpaces(value).match(/\b((?:19|20)\d{2})\b/u);

  return match ? Number(match[1]) : null;
}

function extractMonthFromText(value: string): number | null {
  const normalized = normalizeYearSpaces(value).toLocaleLowerCase('ru-RU');
  const entry = Object.entries(MONTH_MAP).find(([word]) => normalized.includes(word));

  return entry?.[1] ?? null;
}

function extractPageCount(footerParagraphs: string[]): number {
  const pages = footerParagraphs
    .map((paragraph) => Number(paragraph.trim()))
    .filter((page) => Number.isInteger(page) && page > 0);

  return pages.length > 0 ? Math.max(...pages) : 0;
}

function isDocumentHeadingLine(value: string): boolean {
  return /^(Диктовка|Лекция|Лекции|Курс\s+лекций|Семинар|Учения|Проповедь)(?:\s|$)/iu.test(value.trim());
}

function isFooterAttributionLine(value: string): boolean {
  return /^(Диктовка|Лекция|Лекции|Курс\s+лекций|Учения|Проповедь)\s+.+\s+(была|был|были|дана|дан|даны|передана|передан|переданы|прочитана|прочитан|прочитаны|через)(?:\s|$)/iu.test(value.trim());
}

function isInnerHeaderContinuationLine(value: string, header: string[]): boolean {
  const trimmed = value.trim();

  if (!trimmed || header.length >= 4 || trimmed.length > 150) {
    return false;
  }

  if (isPearlPublicationLine(trimmed)) {
    return false;
  }

  if (header.some(isPearlPublicationLine)) {
    return trimmed.length <= 90 && !/[.!?]$/u.test(trimmed);
  }

  return isDocumentTitleCandidate(trimmed) || !/[.!?]$/u.test(trimmed);
}

function isDocumentTitleCandidate(value: string): boolean {
  const trimmed = value.trim();
  const wordCount = trimmed.split(/\s+/u).length;

  return !isCoverMetadataLine(trimmed)
    && !/^через\s+/iu.test(trimmed)
    && !/^ПРИЗЫВ\b/iu.test(trimmed)
    && !/^\*+$/u.test(trimmed)
    && !/\(?избранные\s+учения\)?/iu.test(trimmed)
    && !/,$/u.test(trimmed)
    && trimmed.length <= 150
    && !(wordCount > 18 && /[.!?]$/u.test(trimmed))
    && !isDocumentHeadingLine(trimmed)
    && !isPearlPublicationLine(trimmed);
}

function isCoverMetadataLine(value: string): boolean {
  return /Жемчужин[аыеуой]+\s+Мудрости/iu.test(value)
    || isRunningPublicationLine(value);
}

function isRunningPublicationLine(value: string): boolean {
  return /^[А-ЯЁа-яё]+\s+(?:19|20)\d{2}$/u.test(normalizeYearSpaces(value.trim()));
}

function isPearlPublicationLine(value: string): boolean {
  return /^Том\s+\d+\s*,?\s*№/iu.test(value.trim());
}

function isPageNumber(value: string): boolean {
  return /^\d+$/u.test(value.trim());
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeYearSpaces(value: string): string {
  return value.replace(/\b([12])\s*(\d)\s*(\d)\s*(\d)\b/gu, '$1$2$3$4');
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
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

function toSlugPart(value: string): string {
  return value
    .replace(/&/g, ' and ')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
