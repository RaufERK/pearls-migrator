/**
 * Pure, dependency-free catalog constants and helpers shared between the
 * offline CLI/seed pipeline (src/catalog.ts) and the Next.js runtime
 * (web/lib/pearls.ts, web/app/pearls/[year]/[slug]/page.tsx), which imports
 * this file directly across the web/ boundary since it has no side effects.
 *
 * No filesystem, Prisma, or Next imports here: this file must stay safe to
 * import from both a NodeNext CLI context and a bundler-resolved Next app.
 */

export type Paragraph = {
  text: string;
};

export const MONTH_NAMES = [
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

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  teaching: 'Учения',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export function getDocumentTypeLabel(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType;
}

export function normalizeAuthorDisplayName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/^Господа Майтрейи$/u, 'Господь Майтрейя')
    .replace(/^Архангела Михаила$/u, 'Архангел Михаил')
    .replace(/^возлюбленного Гелиоса$/u, 'Возлюбленный Гелиос')
    .replace(/^возлюбленный/u, 'Возлюбленный')
    .trim();

  return normalized.length > 0 ? normalized : null;
}

type SitePublicationLike = {
  siteLabel: string | null;
  siteMonth: number | null;
  siteYear: number;
};

export function toSitePublicationLabel(pearl: SitePublicationLike): string {
  if (pearl.siteLabel) {
    return pearl.siteLabel;
  }

  if (!pearl.siteMonth) {
    return String(pearl.siteYear);
  }

  return `${MONTH_NAMES[pearl.siteMonth - 1]} ${pearl.siteYear}`;
}

export function toBody(content: string): Paragraph[] {
  return content.split(/\n{2,}/u).map((text) => ({ text })).filter((paragraph) => paragraph.text.trim().length > 0);
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function extractPartTitle(header: string[]): string | null {
  return header.find((line) => /^Часть\s+[IVXLCDM\d]+$/iu.test(line.trim())) ?? null;
}
