import { readFile } from 'node:fs/promises';

import Handlebars from 'handlebars';

import type { PearlCatalogItem, PearlDocument } from './types.js';

export async function renderPearlPage(
  document: PearlDocument,
  item: PearlCatalogItem,
  templatePath: string,
  siteUrl: string,
): Promise<string> {
  return renderTemplate(templatePath, {
    document,
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
