import { readFile } from 'node:fs/promises';

import type { PearlDocument } from './types.js';

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}
