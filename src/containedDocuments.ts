import type { ContainedDocument, Paragraph, PearlDocument } from './types.js';

const monthNames = [
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

export function extractContainedDocuments(document: PearlDocument): ContainedDocument[] {
  const candidates = [
    document.parts.header.length > 0 ? document.parts.header : document.subtitle,
    ...extractHeaderBlocksAfterFooters(getBody(document).map((paragraph) => paragraph.text)),
  ];
  const documents = candidates
    .map(toContainedDocument)
    .filter((item): item is ContainedDocument => Boolean(item));
  const seen = new Set<string>();

  return documents.filter((item) => {
    const key = normalizeSpaces([item.author, item.title, item.rawHeader].filter(Boolean).join('|')).toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function getBody(document: PearlDocument): Paragraph[] {
  return document.parts.body.length > 0 ? document.parts.body : document.paragraphs;
}

function extractHeaderBlocksAfterFooters(lines: string[]): string[][] {
  const result: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isFooterSeparatorText(lines[i])) {
      continue;
    }

    const header: string[] = [];

    for (const line of lines.slice(i + 1, i + 7)) {
      if (!isContainedHeaderLine(line, header.length)) {
        break;
      }

      header.push(line);
    }

    if (header.length > 0) {
      result.push(header);
    }
  }

  return result;
}

function toContainedDocument(lines: string[]): ContainedDocument | null {
  const rawLines = lines.map(normalizeSpaces).filter(Boolean);
  const usefulLines = rawLines.filter((line) => !isSitePublicationLine(line));
  const rawHeader = usefulLines.join(' · ');

  if (!rawHeader) {
    return null;
  }

  const author = capitalizeFirstLetter(extractContainedAuthor(usefulLines));
  const titleLines = usefulLines.filter((line) => !isPearlPublicationLine(line) && !isDocumentTypeLine(line) && isContainedTitleLine(line));
  const title = titleLines.length > 0 ? titleLines.join(' · ') : null;

  return {
    author,
    title,
    rawHeader,
  };
}

function isContainedTitleLine(value: string): boolean {
  return !/\.$/u.test(value);
}

function isFooterSeparatorText(value: string): boolean {
  return /_{8,}/u.test(value) || /[-–—]{8,}/u.test(value);
}

function isContainedHeaderLine(value: string, index: number): boolean {
  const line = normalizeSpaces(value);

  if (!line || line.length > 130) {
    return false;
  }

  return isPearlPublicationLine(line)
    || isDocumentTypeLine(line)
    || /[«"][^»"]+[»"]/.test(line)
    || (index > 0 && line.length <= 90 && !/[.!?]$/u.test(line));
}

function isSitePublicationLine(value: string): boolean {
  return Boolean(parseSitePublicationLine(value));
}

function isPearlPublicationLine(value: string): boolean {
  return /^Том\s+\d+\s*,?\s*№/iu.test(value);
}

function isDocumentTypeLine(value: string): boolean {
  return /^(Диктовка|Лекция|Проповедь)(\s|$)/iu.test(value);
}

function extractContainedAuthor(lines: string[]): string | null {
  const pearlLine = lines.find(isPearlPublicationLine);

  if (pearlLine) {
    const parts = pearlLine.split(/\s+[–-]\s+/u).map(normalizeSpaces);

    if (parts[1]) {
      return parts[1];
    }
  }

  const typeLine = lines.find(isDocumentTypeLine);

  if (!typeLine) {
    return null;
  }

  const author = typeLine
    .replace(/^(Диктовка|Лекция|Проповедь)\s+/iu, '')
    .replace(/\s+(была|был|дана|дан|прочитана|прочитан|передана|передан|через)(\s|$).*$/iu, '')
    .replace(/[«»"]/g, '')
    .trim();

  return author.length > 0 ? author : null;
}

function parseSitePublicationLine(value: string): { year: number; month: number } | null {
  const normalized = normalizeYearSpaces(value).toLowerCase();
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/u);

  if (!yearMatch) {
    return null;
  }

  const month = monthNames.findIndex((name) => normalized.includes(name.toLowerCase()));

  return month >= 0 ? { year: Number(yearMatch[0]), month: month + 1 } : null;
}

function normalizeYearSpaces(value: string): string {
  return value.replace(/\b([12])\s*(\d)\s*(\d)\s*(\d)\b/gu, '$1$2$3$4');
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function capitalizeFirstLetter(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
