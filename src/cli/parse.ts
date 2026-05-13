import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from '../pdf/extractPearl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const pdfPaths = await listPdfFiles(rootDir, resolve(rootDir, 'pearls'));

for (const pdfPath of pdfPaths) {
  const sourcePath = resolve(rootDir, pdfPath);
  const jsonPath = toJsonPath(pdfPath);
  const outputPath = resolve(rootDir, jsonPath);
  const document = await extractPearlDocument(sourcePath, {
    sourcePdf: pdfPath,
    jsonPath,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  const paragraphsCount = document.documents.reduce((count, innerDocument) => count + innerDocument.parts.body.length, 0);

  console.log(`Parsed ${document.slug}: ${document.documents.length} documents, ${paragraphsCount} paragraphs from ${document.meta.pages} pages`);
  console.log(`Layout: ${document.meta.layout}`);
  console.log(`Saved: ${outputPath}`);
}

function toJsonPath(pdfPath: string): string {
  const parts = pdfPath.split(sep);
  const year = parts[1] ?? 'archive';
  const fileName = `${basename(pdfPath, extname(pdfPath))}.json`;

  return `data/parsed/${year}/${fileName}`;
}

async function listPdfFiles(rootPath: string, dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listPdfFiles(rootPath, entryPath);
      }

      return entry.isFile() && entry.name.toLowerCase().endsWith('.pdf') ? [relative(rootPath, entryPath)] : [];
    }),
  );

  return files.flat().sort();
}
