import { readFile } from 'node:fs/promises';

import Handlebars from 'handlebars';

import type { PearlDocument } from './types.js';

export async function renderPearlPage(document: PearlDocument, templatePath: string): Promise<string> {
  return renderTemplate(templatePath, {
    document,
    year: new Date().getFullYear(),
  });
}

export async function renderTemplate(templatePath: string, data: unknown): Promise<string> {
  const templateSource = await readFile(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);

  return template(data);
}
