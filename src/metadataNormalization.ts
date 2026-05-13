import type { AiMetadata } from './metadataAi.js';
import type { AuthorMetadata, CreationMetadata, PearlInnerDocument, PearlPublication } from './types.js';

type MetadataEvidence = {
  header: string[];
  footer: string[];
  bodyPreview: string[];
};

export function applyAiMetadata(document: PearlInnerDocument, metadata: AiMetadata, evidence?: MetadataEvidence): PearlInnerDocument {
  const documentType = metadata.documentType ?? document.documentType;
  const author = normalizeAuthor(document.author, metadata.author, document.pearlPublication.raw ?? metadata.pearlPublication.raw, documentType);
  const documentTitle = pickDocumentTitle(document, metadata, author.name);

  return {
    ...document,
    documentTitle,
    documentType,
    author,
    creation: normalizeCreation(document.creation, metadata.creation),
    pearlPublication: normalizePearlPublication(document.pearlPublication, metadata.pearlPublication, evidence),
  };
}

export function normalizeExistingDocument(document: PearlInnerDocument): PearlInnerDocument {
  const author = normalizeAuthor(document.author, {
    name: document.author.name,
    raw: document.author.raw,
    confidence: 'high',
  }, document.pearlPublication.raw, document.documentType);

  return {
    ...document,
    documentTitle: pickDocumentTitle(document, null, author.name),
    author,
  };
}

function normalizeAuthor(current: AuthorMetadata, aiAuthor: AiMetadata['author'], pearlRaw: string | null, documentType: string): AuthorMetadata {
  const pearlAuthor = extractAuthorFromPearlLine(pearlRaw);
  const preferredRaw = documentType === 'dictation' && pearlAuthor ? pearlAuthor : normalizeNullableText(aiAuthor.raw) ?? current.raw;
  const preferredName = documentType === 'dictation' && pearlAuthor ? pearlAuthor : aiAuthor.name;
  const name = normalizeAuthorName(preferredName) ?? normalizeAuthorName(current.name);

  return {
    name,
    slug: name ? toSlugPart(transliterateRussian(name)) : current.slug,
    raw: preferredRaw,
  };
}

function normalizeAuthorName(value: string | null): string | null {
  const normalized = normalizeNullableText(value);

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase().replace(/\s+/g, ' ');

  if (/^[эе]\.?\s*к\.?\s*профет$/iu.test(lower) || lower === 'возлюбленный посланник' || lower === 'посланник') {
    return 'Элизабет Клэр Профет';
  }

  if (/^марка\s+л\.?\s+профет[а]?$/iu.test(lower) || /^марк\s+л\.?\s+профет$/iu.test(lower)) {
    return 'Марк Л. Профет';
  }

  return capitalizeFirstLetter(normalized);
}

function pickDocumentTitle(document: PearlInnerDocument, metadata: AiMetadata | null, authorName: string | null): string | null {
  const currentTitle = normalizeDocumentTitle(document.documentTitle, authorName);
  const aiTitle = metadata ? normalizeDocumentTitle(metadata.documentTitle, authorName) : null;
  const headerTitle = extractTitleFromHeader(document.parts.header, authorName);

  if (!currentTitle) {
    return aiTitle ?? headerTitle;
  }

  if (headerTitle && shouldPreferHeaderTitle(currentTitle, headerTitle)) {
    return headerTitle;
  }

  return currentTitle;
}

function shouldPreferHeaderTitle(currentTitle: string, headerTitle: string): boolean {
  return /^(Проповедь|Лекция|Диктовка)\s+о\s+/iu.test(headerTitle)
    && !/^(Проповедь|Лекция|Диктовка)\s+/iu.test(currentTitle);
}

function normalizeDocumentTitle(value: string | null, authorName: string | null): string | null {
  const normalized = normalizeNullableText(value)?.replace(/\s+([,.!?;:])/gu, '$1') ?? null;

  if (!normalized || isBodyMarkerTitle(normalized)) {
    return null;
  }

  return removeAuthorFromTitle(normalized, authorName);
}

function extractTitleFromHeader(header: string[], authorName: string | null): string | null {
  const headerTitle = header
    .map((line) => normalizeNullableText(line))
    .find((line): line is string => line !== null && /^(Диктовка|Лекция|Проповедь)\s+/iu.test(line));

  return normalizeDocumentTitle(headerTitle ?? null, authorName);
}

function isBodyMarkerTitle(value: string): boolean {
  return /^(открывающий\s+)?призыв$/iu.test(value)
    || /^молитва$/iu.test(value)
    || /^преамбула$/iu.test(value);
}

function removeAuthorFromTitle(value: string, authorName: string | null): string {
  let title = value;

  if (authorName === 'Элизабет Клэр Профет') {
    title = title
      .replace(/\bЭ\.?\s*К\.?\s*Профет\b/giu, '')
      .replace(/\bЭлизабет\s+Клэр\s+Профет\b/giu, '');
  }

  if (authorName === 'Марк Л. Профет' || authorName === 'Марка Л. Профета') {
    title = title
      .replace(/\bМарка\s+Л\.?\s+Профета\b/giu, '')
      .replace(/\bМарк\s+Л\.?\s+Профет\b/giu, '');
  }

  return title
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/gu, '$1')
    .replace(/^(Диктовка|Лекция|Проповедь)\s+по\b/iu, '$1 по')
    .replace(/^(Учения)\s+по\b/iu, '$1 по')
    .trim();
}

function extractAuthorFromPearlLine(value: string | null): string | null {
  const normalized = normalizeNullableText(value);

  if (!normalized || !/^Том\s+\d+/iu.test(normalized)) {
    return null;
  }

  const dashParts = normalized.split(/\s+[–-]\s+/u).map((part) => normalizeNullableText(part));
  const author = dashParts[1] ?? null;

  if (!author || /посланник|профет/iu.test(author)) {
    return null;
  }

  return author;
}

function normalizeCreation(current: CreationMetadata, aiCreation: AiMetadata['creation']): CreationMetadata {
  const date = normalizeIsoDate(aiCreation.date) ?? normalizeIsoDate(current.date);
  const year = date ? Number(date.slice(0, 4)) : normalizeYear(aiCreation.year) ?? current.year;

  return {
    date,
    year,
    raw: normalizeNullableText(aiCreation.raw) ?? current.raw,
  };
}

function normalizePearlPublication(current: PearlPublication, aiPublication: AiMetadata['pearlPublication'], evidence?: MetadataEvidence): PearlPublication {
  if (!isTrustedPearlPublication(aiPublication, evidence)) {
    return current;
  }

  return {
    volume: normalizePositiveInt(aiPublication.volume) ?? current.volume,
    issue: normalizeNullableText(aiPublication.issue) ?? current.issue,
    date: normalizeIsoDate(aiPublication.date) ?? current.date,
    rawDate: normalizeNullableText(aiPublication.rawDate) ?? current.rawDate,
    raw: normalizeNullableText(aiPublication.raw) ?? current.raw,
  };
}

function isTrustedPearlPublication(aiPublication: AiMetadata['pearlPublication'], evidence?: MetadataEvidence): boolean {
  const raw = normalizeNullableText(aiPublication.raw);

  if (!raw) {
    return false;
  }

  if (/\.{3}|…/u.test(raw) || !/^Том\s+\d+/iu.test(raw)) {
    return false;
  }

  if (!evidence) {
    return true;
  }

  const sourceText = [...evidence.header, ...evidence.footer, ...evidence.bodyPreview].join('\n');

  return sourceText.includes(raw);
}

function normalizeNullableText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeIsoDate(value: string | null): string | null {
  const normalized = normalizeNullableText(value);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/u);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return normalized;
}

function normalizeYear(value: number | null): number | null {
  return value && value >= 1000 && value <= 2999 ? value : null;
}

function normalizePositiveInt(value: number | null): number | null {
  return value && value > 0 ? value : null;
}

function capitalizeFirstLetter(value: string): string {
  return value.replace(/^(\p{L})/u, (letter) => letter.toUpperCase());
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
