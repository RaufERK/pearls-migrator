import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import type { LegacyCatalogReference } from './legacyCatalog.js';
import type { DocumentType, PearlInnerDocument, SitePublication } from './types.js';

const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
const DocumentTypeSchema = z.enum(['dictation', 'lecture', 'lectureCourse', 'teaching', 'sermon', 'prayer', 'material']);
const NullableStringSchema = z.string().nullable();
const NullableNumberSchema = z.number().int().nullable();

export const AiMetadataSchema = z.object({
  documentTitle: NullableStringSchema,
  documentType: DocumentTypeSchema.nullable(),
  author: z.object({
    name: NullableStringSchema,
    raw: NullableStringSchema,
    confidence: ConfidenceSchema,
  }),
  creation: z.object({
    date: NullableStringSchema,
    year: NullableNumberSchema,
    raw: NullableStringSchema,
    confidence: ConfidenceSchema,
  }),
  pearlPublication: z.object({
    volume: NullableNumberSchema,
    issue: NullableStringSchema,
    date: NullableStringSchema,
    rawDate: NullableStringSchema,
    raw: NullableStringSchema,
    confidence: ConfidenceSchema,
  }),
  notes: NullableStringSchema,
});

export type AiMetadata = z.infer<typeof AiMetadataSchema>;

export type MetadataCandidate = {
  sourcePdf: string;
  sourceWord: string | null;
  sourceFileName: string | null;
  sourceMap: {
    originalName: string;
    oldPath: string;
    newPath: string;
  } | null;
  jsonPath: string;
  documentIndex: number;
  sitePublication: SitePublication;
  current: Pick<PearlInnerDocument, 'documentTitle' | 'documentType' | 'author' | 'creation' | 'pearlPublication'>;
  legacyCatalog: LegacyCatalogReference | null;
  header: string[];
  footer: string[];
  bodyPreview: string[];
};

type ExtractAiMetadataOptions = {
  apiKey?: string;
  model?: string;
};

export const DEFAULT_METADATA_AI_MODEL = 'gpt-5.4-mini';

export const SYSTEM_PROMPT = [
  'Ты извлекаешь метаданные русскоязычных документов из серии "Жемчужины Мудрости".',
  'Тебе дают header, footer, короткий bodyPreview, текущие эвристические значения, sourceWord/sourceFileName/sourceMap и иногда legacyCatalog из старого каталога сайта.',
  'Не используй внешние знания и не придумывай факты. Если поля нет в тексте или legacyCatalog, верни null.',
  'sourceMap.originalName - исходное имя файла до нормализации архива. Используй его как дополнительную подсказку для documentTitle, author и creation, если оно согласуется с header/footer/bodyPreview.',
  'Не используй служебные части имени файла как название: "ЖМ", "Read", "ed.", "DVD", "рассылка", "брошюра", "for web", "в макет", номера месяцев и технические суффиксы.',
  'legacyCatalog - это справочник старого сайта по текущему slug. Используй currentDocument для текущего внутреннего документа, а documents только чтобы не перепутать материалы в составной брошюре.',
  'Если legacyCatalog конфликтует с header/footer, предпочитай header/footer и выставляй меньшую confidence.',
  'Не смешивай метаданные разных внутренних документов.',
  'Дата creation - это когда диктовка/лекция/курс лекций/проповедь была дана или прочитана, а pearlPublication.date - дата публикации в строке "Том ... № ...".',
  'author.name должен быть нормализованным именем автора. "Э. К. Профет", "Э.К. Профет" и "Возлюбленный Посланник" для неё возвращай как "Элизабет Клэр Профет".',
  'documentTitle не должен быть служебным маркером тела: "ПРИЗЫВ", "Призыв", "Открывающий призыв", "Молитва", "Преамбула".',
  'documentTitle не должен быть первой длинной фразой bodyPreview. Если явного названия нет, верни null.',
  'Строки "Жемчужины Мудрости", дата публикации на сайте и "(избранные учения)" - служебные, не используй их как author или documentTitle.',
  'Если отдельного названия нет, но есть строка "Проповедь/Лекция/Курс лекций/Диктовка ...", можно использовать ее как documentTitle, убрав повтор автора.',
  'Не дублируй автора в названии: "Учения Элизабет Клэр Профет по Книге Откровения" верни как "Учения по Книге Откровения".',
  'Если header содержит "Проповедь Э. К. Профет о самоосуждении", documentTitle должен быть "Проповедь о самоосуждении", а не название песни или первая строка bodyPreview.',
  'documentType должен быть одним из: dictation, lecture, lectureCourse, teaching, sermon, prayer, material.',
  'Если материал обозначен как "Курс лекций ...", возвращай documentType="lectureCourse".',
  'Если материал обозначен как "Учения ...", возвращай documentType="teaching".',
  'Даты возвращай в ISO формате YYYY-MM-DD, если точный день найден. Если понятен только год, date=null и year=год.',
  'raw-поля должны содержать исходную строку, на основании которой сделан вывод.',
  'Если не уверен — выбирай null и confidence="low".'
].join('\n');

export async function extractMetadataWithAi(candidate: MetadataCandidate, options: ExtractAiMetadataOptions = {}): Promise<AiMetadata> {
  const client = new OpenAI({ apiKey: options.apiKey });

  try {
    const response = await client.responses.parse({
      model: options.model ?? DEFAULT_METADATA_AI_MODEL,
      temperature: 0,
      top_p: 1,
      input: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify(candidate, null, 2),
        },
      ],
      text: {
        format: zodTextFormat(AiMetadataSchema, 'pearl_metadata'),
      },
    });

    if (!response.output_parsed) {
      throw new Error('AI response did not match metadata schema');
    }

    return response.output_parsed;
  } catch (error) {
    throwIfOpenAiUnavailable(error);
    throw error;
  }
}

export class OpenAiUnavailableError extends Error {
  readonly code = 'OPENAI_UNAVAILABLE' as const;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'OpenAiUnavailableError';
  }
}

export function isOpenAiUnavailableError(error: unknown): error is OpenAiUnavailableError {
  return error instanceof OpenAiUnavailableError
    || (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'OPENAI_UNAVAILABLE');
}

export function throwIfOpenAiUnavailable(error: unknown): void {
  if (!looksLikeOpenAiRegionOrAccessError(error)) {
    return;
  }

  throw new OpenAiUnavailableError(
    [
      'ВКЛЮЧИ ВПН!!! МОДЕЛЬ НЕДОСТУПНА!',
      'OpenAI вернул ошибку доступа по региону/санкциям (часто: 403 Country, region, or territory not supported).',
      'Без VPN metadata:ai останавливается. Не выдумываем названия эвристиками — дождись доступа к модели и перезапусти.',
    ].join('\n'),
    error,
  );
}

function looksLikeOpenAiRegionOrAccessError(error: unknown): boolean {
  const status = readErrorStatus(error);
  const message = toErrorMessage(error).toLowerCase();

  if (status === 403) {
    return true;
  }

  return message.includes('country, region, or territory not supported')
    || message.includes('unsupported_country_region_territory')
    || message.includes('request not allowed')
    || message.includes('permission denied')
    || (message.includes('403') && (message.includes('country') || message.includes('region') || message.includes('territory')));
}

function readErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  if ('status' in error && typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }

  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isDocumentType(value: string): value is DocumentType {
  return DocumentTypeSchema.safeParse(value).success;
}
