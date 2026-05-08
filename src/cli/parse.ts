import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from '../pdf/extractPearl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const pdfPaths = await listPdfFiles(resolve(rootDir, 'pearls'));

for (const pdfPath of pdfPaths) {
  const sourcePath = resolve(rootDir, pdfPath);
  const outputPath = resolve(rootDir, `data/parsed/${toJsonFileName(pdfPath)}`);
  const document = await extractPearlDocument(sourcePath);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  console.log(`Parsed ${document.paragraphs.length} paragraphs from ${document.meta.pages} pages`);
  console.log(`Layout: ${document.meta.layout}`);
  console.log(`Saved: ${outputPath}`);
}

function toJsonFileName(pdfPath: string): string {
  return `${basename(pdfPath, extname(pdfPath))}.json`;
}

async function listPdfFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listPdfFiles(entryPath);
      }

      return entry.isFile() && entry.name.toLowerCase().endsWith('.pdf') ? [entryPath] : [];
    }),
  );

  return files.flat().sort();
}
