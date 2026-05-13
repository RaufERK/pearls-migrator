import type { ContainedDocument, PearlDocument } from './types.js';

export function extractContainedDocuments(document: PearlDocument): ContainedDocument[] {
  return document.documents.map((innerDocument) => ({
    author: innerDocument.author.name,
    title: innerDocument.documentTitle,
    documentType: innerDocument.documentType,
    rawHeader: innerDocument.parts.header.join(' · '),
  }));
}
