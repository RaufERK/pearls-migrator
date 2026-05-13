import { readFile } from 'node:fs/promises';

import Handlebars from 'handlebars';

import type { PearlCatalogItem, PearlDocument, PearlInnerDocument } from './types.js';

type PearlPageInnerDocument = PearlInnerDocument & {
  displayHeader: string[];
};

export async function renderPearlPage(
  document: PearlDocument,
  item: PearlCatalogItem,
  templatePath: string,
  siteUrl: string,
): Promise<string> {
  return renderTemplate(templatePath, {
    document,
    displayDocuments: toDisplayDocuments(document),
    item,
    seo: {
      title: `${document.title} — ${item.siteMonthLabel}`,
      description: item.description,
      canonicalUrl: `${siteUrl}${item.path}`,
    },
  });
}

export async function renderTemplate(templatePath: string, data: unknown): Promise<string> {
  const templateSource = await readFile(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);

  return template(data);
}

function toDisplayDocuments(document: PearlDocument): PearlPageInnerDocument[] {
  return document.documents.map((innerDocument) => ({
    ...innerDocument,
    displayHeader: innerDocument.parts.header.filter((line) => line !== document.sitePublication.label),
  }));
}
