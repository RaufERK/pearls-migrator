import type { ContainedDocument, DocumentType, PearlDocument } from './types.js';

const documentTypeLabels: Record<DocumentType, string> = {
  dictation: 'Диктовка',
  lecture: 'Лекция',
  lectureCourse: 'Курс лекций',
  sermon: 'Проповедь',
  prayer: 'Молитва',
  material: 'Материал',
};

export function extractContainedDocuments(document: PearlDocument): ContainedDocument[] {
  return document.documents.map((innerDocument) => ({
    author: innerDocument.author.name,
    title: innerDocument.documentTitle,
    documentType: innerDocument.documentType,
    documentTypeLabel: documentTypeLabels[innerDocument.documentType],
    rawHeader: innerDocument.parts.header.join(' · '),
  }));
}
