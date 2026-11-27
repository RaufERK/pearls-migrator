import { z } from 'zod';

import type { DocumentType } from './types.js';

export const CORPUS_FORMAT = 1;

const DOCUMENT_TYPES = ['dictation', 'lecture', 'lectureCourse', 'teaching', 'sermon', 'prayer', 'material'] as const;

type MissingDocumentType = Exclude<DocumentType, (typeof DOCUMENT_TYPES)[number]>;
const missingDocumentTypes: MissingDocumentType extends never ? [] : MissingDocumentType[] = [];
void missingDocumentTypes;

const NullableStringSchema = z.string().nullable();
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable();

export const CorpusRecordSchema = z.object({
  slug: z.string().min(1),
  siteYear: z.number().int(),
  siteMonth: z.number().int().min(1).max(12).nullable(),
  siteLabel: NullableStringSchema,
  siteSortDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  pearlTitle: z.string(),
  position: z.number().int().positive(),
  documentTitle: NullableStringSchema,
  documentType: z.enum(DOCUMENT_TYPES),
  description: z.string(),
  authorName: NullableStringSchema,
  authorDisplayName: NullableStringSchema,
  authorSlug: NullableStringSchema,
  creationDate: IsoDateSchema,
  creationYear: z.number().int().nullable(),
  creationRaw: NullableStringSchema,
  content: z.string(),
  paragraphsCount: z.number().int().nonnegative(),
});

export type CorpusRecord = z.infer<typeof CorpusRecordSchema>;

export const CorpusManifestSchema = z.object({
  format: z.literal(CORPUS_FORMAT),
  createdAt: z.string().min(1),
  file: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  pearls: z.number().int().nonnegative(),
  documents: z.number().int().nonnegative(),
  paragraphs: z.number().int().nonnegative(),
});

export type CorpusManifest = z.infer<typeof CorpusManifestSchema>;
