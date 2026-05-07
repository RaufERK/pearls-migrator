import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from '../pdf/extractPearl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const pdfPath = resolve(rootDir, 'pearls/2006/1994_12_25_Morya.pdf');
const outputPath = resolve(rootDir, 'data/parsed/1994_12_25_Morya.json');

const document = await extractPearlDocument(pdfPath);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

console.log(`Parsed ${document.paragraphs.length} paragraphs from ${document.meta.pages} pages`);
console.log(`Layout: ${document.meta.layout}`);
console.log(`Saved: ${outputPath}`);
