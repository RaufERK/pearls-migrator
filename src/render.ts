import { readFile } from 'node:fs/promises';

import Handlebars from 'handlebars';

import type { PearlDocument } from './types.js';

export async function renderPearlPage(document: PearlDocument, templatePath: string): Promise<string> {
  const templateSource = await readFile(templatePath, 'utf8');
  const template = Handlebars.compile(templateSource);

  return template({
    document,
    year: new Date().getFullYear(),
  });
}
