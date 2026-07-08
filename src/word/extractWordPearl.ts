import { readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
import { getSourceRootDir, parseQuarterSegment, sourceMapOverrideCandidates } from '../sourceArchive.js';
import { extractDocxText, type DocxParagraph } from './extractDocxText.js';

type ExtractWordPearlOptions = {
  sourceWord: string;
  preparedDocx: string;
  jsonPath: string;
  parsedAt?: string;
};

type InnerDocumentSegment = {
  header: Paragraph[];
  body: Paragraph[];
  footer: Paragraph[];
};

type SourcePublicationParts = {
  year: number | null;
  quarter: number | null;
  month: number | null;
  rawLabel: string | null;
};

type WordProcessingMap = {
  files?: Record<string, WordFileOverride>;
};

type WordFileOverride = {
  expectedDocuments?: number;
  splitBefore?: string[];
  documents?: WordDocumentOverride[];
  notes?: string;
};

type WordDocumentOverride = {
  title?: string;
  titleAlternatives?: string[];
  notes?: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const sourceRootDir = getSourceRootDir(rootDir);
const wordProcessingMapPath = resolve(rootDir, 'data/word-processing-map.json');
let cachedWordProcessingMap: WordProcessingMap | null | undefined;

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
const MONTH_WORD_PATTERN = new RegExp(`(?:^|[^\\p{L}])(${Object.keys(MONTH_MAP).join('|')})(?=$|[^\\p{L}])`, 'iu');

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
  const bodyParagraphs = extracted.body.paragraphs.map(toParagraph).filter((paragraph) => paragraph.text.length > 0 && !isPageNumber(paragraph.text));
  const fileOverride = getWordFileOverride(options.sourceWord);
  const segments = splitIntoInnerDocumentSegments(bodyParagraphs, fileOverride);
  const documents = segments
    .map((segment) => buildInnerDocument(segment, options.sourceWord))
    .map((document, index) => applyDocumentOverride(document, fileOverride, index));
  const sitePublication = extractSitePublication(options.sourceWord, [
    ...bodyParagraphs.slice(0, 8).map((paragraph) => paragraph.text),
    ...extracted.headers.flatMap((part) => part.paragraphs.map((paragraph) => paragraph.text)),
    ...extracted.footers.flatMap((part) => part.paragraphs.map((paragraph) => paragraph.text)),
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
      pages: extractPageCount(extracted.footers.flatMap((part) => part.paragraphs.map((paragraph) => paragraph.text))),
      layout: 'single-column',
    },
  };
}

function toParagraph(paragraph: DocxParagraph): Paragraph {
  return {
    text: normalizeSpaces(paragraph.text),
    styleId: paragraph.styleId,
    isBold: paragraph.isBold,
    isItalic: paragraph.isItalic,
    maxFontSize: paragraph.maxFontSize,
    boldTextRatio: roundRatio(paragraph.boldTextRatio),
  };
}

function getWordFileOverride(sourceWord: string): WordFileOverride | null {
  const processingMap = getWordProcessingMap();
  const candidates = sourceMapOverrideCandidates(sourceWord, rootDir, sourceRootDir);

  return candidates.map((candidate) => processingMap?.files?.[candidate]).find(Boolean) ?? null;
}

function getWordProcessingMap(): WordProcessingMap | null {
  if (cachedWordProcessingMap !== undefined) {
    return cachedWordProcessingMap;
  }

  try {
    cachedWordProcessingMap = JSON.parse(readFileSync(wordProcessingMapPath, 'utf8')) as WordProcessingMap;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      cachedWordProcessingMap = null;

      return cachedWordProcessingMap;
    }

    throw error;
  }

  return cachedWordProcessingMap;
}

function splitIntoInnerDocumentSegments(paragraphs: Paragraph[], fileOverride: WordFileOverride | null): InnerDocumentSegment[] {
  const bodyStartIndex = findBodyStartIndex(paragraphs);
  const rootHeader = paragraphs.slice(0, bodyStartIndex).filter((paragraph) => !isPageNumber(paragraph.text));
  const segments: InnerDocumentSegment[] = [];
  let current: InnerDocumentSegment = {
    header: rootHeader,
    body: [],
    footer: [],
  };
  let expectsNextHeader = false;
  let collectsHeader = false;

  const bodyParagraphs = paragraphs.slice(bodyStartIndex);

  for (let index = 0; index < bodyParagraphs.length; index += 1) {
    const paragraph = bodyParagraphs[index];
    const text = paragraph.text;

    if (isPageNumber(text) || isRunningPublicationLine(text)) {
      continue;
    }

    if (isFooterAttributionLine(text)) {
      current.footer.push(paragraph);
      expectsNextHeader = true;
      collectsHeader = false;
      continue;
    }

    if (isPearlPublicationLine(text) && current.body.length === 0 && current.footer.length === 0) {
      current.header.push(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if ((expectsNextHeader || current.body.length > 0 || current.footer.length > 0) && isPearlPublicationLine(text)) {
      segments.push(current);
      current = createInnerDocumentSegment(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if (expectsNextHeader && isDocumentHeadingLine(text)) {
      segments.push(current);
      current = createInnerDocumentSegment(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if (shouldStartMappedDocument(paragraph, current, fileOverride)) {
      segments.push(current);
      current = createInnerDocumentSegment(paragraph);
      expectsNextHeader = false;
      collectsHeader = true;
      continue;
    }

    if (collectsHeader && isInnerHeaderContinuationLine(paragraph.text, current.header)) {
      current.header.push(paragraph);
      continue;
    }

    expectsNextHeader = false;
    collectsHeader = false;
    current.body.push(paragraph);
  }

  segments.push(current);

  return segments.filter((segment) => segment.header.length > 0 || segment.body.length > 0 || segment.footer.length > 0);
}

function createInnerDocumentSegment(headerLine: Paragraph): InnerDocumentSegment {
  return {
    header: [headerLine],
    body: [],
    footer: [],
  };
}

function shouldStartMappedDocument(paragraph: Paragraph, current: InnerDocumentSegment, fileOverride: WordFileOverride | null): boolean {
  if (!fileOverride?.splitBefore || current.body.length === 0) {
    return false;
  }

  const normalizedParagraph = normalizeSpaces(paragraph.text);

  return fileOverride.splitBefore.some((line) => normalizeSpaces(line) === normalizedParagraph);
}

function findBodyStartIndex(paragraphs: Paragraph[]): number {
  const limit = Math.min(paragraphs.length, 14);
  const typeIndex = paragraphs.slice(0, limit).findIndex((paragraph) => isDocumentHeadingLine(paragraph.text));

  if (typeIndex >= 0 && typeIndex + 2 < paragraphs.length) {
    return typeIndex + 2;
  }

  for (let index = 0; index < limit; index += 1) {
    const paragraph = paragraphs[index].text;

    if (!isCoverMetadataLine(paragraph) && paragraph.length >= 45) {
      return index;
    }
  }

  return Math.min(4, paragraphs.length);
}

function buildInnerDocument(segment: InnerDocumentSegment, sourceWord: string): PearlInnerDocument {
  const headerText = segment.header.map((paragraph) => paragraph.text);
  const bodyText = segment.body.map((paragraph) => paragraph.text);
  const footerText = segment.footer.map((paragraph) => paragraph.text);
  const metadataText = [
    ...headerText,
    ...footerText,
  ].join('\n');
  const pearlPublication = extractPearlPublication([
    ...headerText,
    ...bodyText,
    ...footerText,
  ]);
  const author = extractAuthor(headerText, metadataText, sourceWord, pearlPublication.raw);

  return {
    documentTitle: extractDocumentTitle(segment.header, segment.body, segment.footer),
    documentType: extractDocumentType(metadataText),
    author,
    creation: extractCreation(footerText.join('\n'), sourceWord),
    pearlPublication,
    parts: {
      header: headerText,
      body: segment.body,
      footer: segment.footer,
    },
  };
}

function applyDocumentOverride(document: PearlInnerDocument, fileOverride: WordFileOverride | null, index: number): PearlInnerDocument {
  const title = fileOverride?.documents?.[index]?.title;

  if (!title) {
    return document;
  }

  return {
    ...document,
    documentTitle: title,
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
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const quarter = normalizedPath.split('/').map(parseQuarterSegment).find((partQuarter): partQuarter is number => partQuarter !== null) ?? null;
  const month = extractMonthFromText(fileName) ?? extractMonthFromQuarterSlug(fileName) ?? extractMonthFromQuarterIndex(fileName, quarter) ?? extractMonthFromBrochureNumber(fileName, quarter);
  const rawLabel = year && month ? `${MONTH_LABELS[month - 1].toLocaleLowerCase('ru-RU')} ${year}` : null;

  return {
    year,
    quarter,
    month,
    rawLabel,
  };
}

function extractMonthFromQuarterSlug(fileName: string): number | null {
  const match = /(?:^|[^0-9])(?:19|20)\d{2}Q([1-4])-([1-3])(?:$|[^0-9])/iu.exec(fileName.normalize('NFC'));

  return match ? (Number(match[1]) - 1) * 3 + Number(match[2]) : null;
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

function extractMonthFromBrochureNumber(fileName: string, quarter: number | null): number | null {
  if (!quarter) {
    return null;
  }

  const match = fileName.match(/^(\d{1,2})[_\s-]/u);
  const brochureNumber = match ? Number(match[1]) : null;

  if (!brochureNumber) {
    return null;
  }

  if (brochureNumber >= 1 && brochureNumber <= 3) {
    return (quarter - 1) * 3 + brochureNumber;
  }

  const quarterStart = (quarter - 1) * 3 + 1;
  const quarterEnd = quarter * 3;

  return brochureNumber >= quarterStart && brochureNumber <= quarterEnd ? brochureNumber : null;
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

    if (dashParts.length >= 2 && dashParts[1]) {
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

function extractDocumentTitle(header: Paragraph[], body: Paragraph[], footer: Paragraph[]): string | null {
  const bodyPartTitle = extractBodyPartTitle(body);

  if (bodyPartTitle) {
    return bodyPartTitle;
  }

  const headerText = header.map((paragraph) => paragraph.text);
  const footerText = footer.map((paragraph) => paragraph.text);
  const formattedTitle = extractFormattedTitle(header, body);

  if (formattedTitle) {
    return formattedTitle;
  }

  const headerPartLine = headerText.map(parsePartLine).find((part): part is string => part !== null);
  const headingLine = headerText.find(isDocumentHeadingLine);

  if (headingLine && headerPartLine && /^(Курс\s+лекций|Семинар|Учения)/iu.test(headingLine)) {
    return `${normalizeSpaces(headingLine)} (${headerPartLine})`;
  }

  const headerCandidates = headerText.filter(isDocumentTitleCandidate);
  const headerQuoted = headerCandidates.map((line) => line.match(/[«"]([^»"]+)[»"]/u)?.[1]).find(Boolean);
  const partLine = body.map((paragraph) => parsePartLine(paragraph.text)).find((part): part is string => part !== null);

  if (headerQuoted && !isGenericTitle(headerQuoted)) {
    const title = normalizeSpaces(headerQuoted);

    return partLine ? `${title} (${partLine})` : title;
  }

  const headerTitle = completeTitleWithBodyContinuation(joinHeaderTitleLines(headerCandidates), body);

  if (headerTitle && !isGenericTitle(headerTitle)) {
    return normalizeSpaces(headerTitle);
  }

  if (headingLine && isSpecificHeadingLine(headingLine)) {
    return normalizeSpaces(headingLine);
  }

  const bodyLeadTitle = extractBodyLeadTitle(body);

  if (bodyLeadTitle) {
    return bodyLeadTitle;
  }

  const footerQuoted = footerText.map((line) => line.match(/[«"]([^»"]+)[»"]/u)?.[1]).find(Boolean);

  if (footerQuoted && !isGenericTitle(footerQuoted)) {
    return normalizeSpaces(footerQuoted);
  }

  return headingLine && !isGenericTitle(headingLine) ? normalizeSpaces(headingLine) : null;
}

function extractFormattedTitle(header: Paragraph[], body: Paragraph[]): string | null {
  const paragraphs = [...header, ...body.slice(0, 6)];
  const startIndex = paragraphs.findIndex(isFormattedTitleCandidate);

  if (startIndex < 0) {
    return null;
  }

  const lines = [paragraphs[startIndex].text];

  for (const paragraph of paragraphs.slice(startIndex + 1, startIndex + 3)) {
    if (!isFormattedTitleCandidate(paragraph) || !isTitleContinuationLine(lines.join(' '), paragraph.text)) {
      break;
    }

    lines.push(paragraph.text);
  }

  return normalizeSpaces(lines.join(' '));
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

function completeTitleWithBodyContinuation(title: string | null, body: Paragraph[]): string | null {
  if (!title) {
    return null;
  }

  const nextLine = body[0]?.text;

  if (!nextLine || !isTitleContinuationLine(title, nextLine)) {
    return title;
  }

  return normalizeSpaces(`${title} ${nextLine}`);
}

function isTitleContinuationLine(title: string, nextLine: string): boolean {
  const trimmedTitle = title.trim();
  const trimmedNextLine = nextLine.trim();

  if (!trimmedNextLine || !isDocumentTitleCandidate(trimmedNextLine) || /[.!?]$/u.test(trimmedTitle)) {
    return false;
  }

  return /^[а-яё]/u.test(trimmedNextLine)
    || /^[«"„][а-яё]/u.test(trimmedNextLine);
}

function extractBodyLeadTitle(body: Paragraph[]): string | null {
  return body
    .slice(0, 6)
    .map((paragraph) => paragraph.text)
    .find(isBodyLeadTitleCandidate) ?? null;
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
  const match = normalized.match(MONTH_WORD_PATTERN);

  return match ? MONTH_MAP[match[1]] ?? null : null;
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

function isSpecificHeadingLine(value: string): boolean {
  const trimmed = value.trim();

  return isDocumentHeadingLine(trimmed)
    && !/^Воскресная\s+проповедь$/iu.test(trimmed)
    && !/^Лекция\s+(?:Э\.?\s*К\.?\s*Профет|Элизабет\s+Клэр\s+Профет)$/iu.test(trimmed)
    && !/^Лекции\s+(?:Э\.?\s*К\.?\s*Профет|Элизабет\s+Клэр\s+Профет|Марк[аом]?\s+Л\.?\s+Профет[аом]?)$/iu.test(trimmed);
}

function isFooterAttributionLine(value: string): boolean {
  return /^(Диктовка|Лекция|Лекции|Курс\s+лекций|Учения|Проповедь)\s+.+\s+(была|был|были|дана|дан|даны|передана|передан|переданы|прочитана|прочитан|прочитаны|через)(?:\s|$)/iu.test(value.trim());
}

function isInnerHeaderContinuationLine(value: string, header: Paragraph[]): boolean {
  const trimmed = value.trim();

  if (!trimmed || header.length >= 4 || trimmed.length > 150) {
    return false;
  }

  if (isPearlPublicationLine(trimmed)) {
    return false;
  }

  if (header.some((paragraph) => isPearlPublicationLine(paragraph.text))) {
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
    && !/^Призыв\s+Посланника:?$/iu.test(trimmed)
    && !/^\*+$/u.test(trimmed)
    && !/\(?избранные\s+учения\)?/iu.test(trimmed)
    && !isAuthorOnlyLine(trimmed)
    && !isRetreatMetadataLine(trimmed)
    && !/,$/u.test(trimmed)
    && trimmed.length <= 150
    && !(wordCount > 18 && /[.!?]$/u.test(trimmed))
    && !isDocumentHeadingLine(trimmed)
    && !isPearlPublicationLine(trimmed);
}

function isBodyLeadTitleCandidate(value: string): boolean {
  const trimmed = value.trim();

  return isDocumentTitleCandidate(trimmed)
    && !isGenericTitle(trimmed)
    && !/^Благословение:?$/iu.test(trimmed)
    && !/^Молитва:?$/iu.test(trimmed);
}

function isFormattedTitleCandidate(paragraph: Paragraph): boolean {
  const text = paragraph.text.trim();

  return isBodyLeadTitleCandidate(text)
    && (paragraph.isBold === true || (paragraph.boldTextRatio ?? 0) >= 0.55 || isLargeTitleParagraph(paragraph));
}

function isLargeTitleParagraph(paragraph: Paragraph): boolean {
  return (paragraph.maxFontSize ?? 0) >= 13 && paragraph.text.trim().length <= 120;
}

function isGenericTitle(value: string): boolean {
  const trimmed = value.trim();

  return isCoverMetadataLine(trimmed)
    || isPearlPublicationLine(trimmed)
    || isAuthorOnlyLine(trimmed)
    || /^ПРИЗЫВ\b/iu.test(trimmed)
    || /^Призыв\s+Посланника:?$/iu.test(trimmed)
    || /^Воскресная\s+проповедь$/iu.test(trimmed)
    || isRetreatMetadataLine(trimmed);
}

function isAuthorOnlyLine(value: string): boolean {
  return /^(?:Марк[аом]?\s+Л\.?\s+Профет[аом]?|Э\.?\s*К\.?\s*Профет|Элизабет\s+Клэр\s+Профет)$/iu.test(value.trim());
}

function isRetreatMetadataLine(value: string): boolean {
  const trimmed = value.trim();

  return /ретрит/iu.test(trimmed)
    && (/\b(?:19|20)\d{2}\b/u.test(normalizeYearSpaces(trimmed)) || trimmed.length <= 60);
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

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
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
