import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import type { DocumentType, PearlInnerDocument, SitePublication } from './types.js';

const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
const DocumentTypeSchema = z.enum(['dictation', 'lecture', 'sermon', 'prayer', 'material']);
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
  jsonPath: string;
  documentIndex: number;
  sitePublication: SitePublication;
  current: Pick<PearlInnerDocument, 'documentTitle' | 'documentType' | 'author' | 'creation' | 'pearlPublication'>;
  header: string[];
  footer: string[];
  bodyPreview: string[];
};

type ExtractAiMetadataOptions = {
  apiKey?: string;
  model?: string;
};

export const SYSTEM_PROMPT = [
  'Ты извлекаешь метаданные русскоязычных документов из серии "Жемчужины Мудрости".',
  'Тебе дают только header, footer, короткий bodyPreview и текущие эвристические значения.',
  'Не используй внешние знания и не придумывай факты. Если поля нет в тексте, верни null.',
  'Не смешивай метаданные разных внутренних документов.',
  'Дата creation - это когда диктовка/лекция была дана, а pearlPublication.date - дата публикации в строке "Том ... № ...".',
  'author.name должен быть нормализованным именем автора. "Э. К. Профет", "Э.К. Профет" и "Возлюбленный Посланник" для неё возвращай как "Элизабет Клэр Профет".',
  'documentTitle не должен быть служебным маркером тела: "ПРИЗЫВ", "Призыв", "Открывающий призыв", "Молитва", "Преамбула".',
  'Если отдельного названия нет, но есть строка "Проповедь/Лекция/Диктовка ...", можно использовать ее как documentTitle, убрав повтор автора.',
  'Не дублируй автора в названии: "Учения Элизабет Клэр Профет по Книге Откровения" верни как "Учения по Книге Откровения".',
  'Если header содержит "Проповедь Э. К. Профет о самоосуждении", documentTitle должен быть "Проповедь о самоосуждении", а не название песни или первая строка bodyPreview.',
  'documentType должен быть одним из: dictation, lecture, sermon, prayer, material.',
  'Даты возвращай в ISO формате YYYY-MM-DD, если точный день найден. Если понятен только год, date=null и year=год.',
  'raw-поля должны содержать исходную строку, на основании которой сделан вывод.',
].join('\n');

export async function extractMetadataWithAi(candidate: MetadataCandidate, options: ExtractAiMetadataOptions = {}): Promise<AiMetadata> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const response = await client.responses.parse({
    model: options.model ?? 'gpt-4o-mini',
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
}

export function isDocumentType(value: string): value is DocumentType {
  return DocumentTypeSchema.safeParse(value).success;
}
