import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from '../pdf/extractPearl.js';

type ParseOptions = {
  files: string[];
  years: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));
const pdfPaths = filterPdfPaths(await listPdfFiles(rootDir, resolve(rootDir, 'pearls')), options);

console.log(`Parsing ${pdfPaths.length} PDF files`);

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

function parseArgs(args: string[]): ParseOptions {
  const options: ParseOptions = {
    files: [],
    years: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('--year=')) {
      options.years.push(arg.slice('--year='.length));
      continue;
    }

    if (arg === '--year') {
      options.years.push(readNextArg(args, index, '--year'));
      index++;
      continue;
    }

    if (arg.startsWith('--file=')) {
      options.files.push(arg.slice('--file='.length));
      continue;
    }

    if (arg === '--file') {
      options.files.push(readNextArg(args, index, '--file'));
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run parse -- [options]',
    '',
    'Options:',
    '  --year <year>       Parse only PDFs from pearls/<year>',
    '  --file <path>       Parse one PDF file',
    '  --help              Show this help',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function filterPdfPaths(pdfPaths: string[], options: ParseOptions): string[] {
  const files = options.files.map(toRelativePdfPath);
  const years = new Set(options.years);

  return pdfPaths.filter((pdfPath) => {
    const matchesFile = files.length === 0 || files.includes(pdfPath);
    const matchesYear = years.size === 0 || years.has(pdfPath.split(sep)[1] ?? '');

    return matchesFile && matchesYear;
  });
}

function toRelativePdfPath(filePath: string): string {
  const normalized = isAbsolute(filePath) ? relative(rootDir, filePath) : filePath;

  return normalized.replace(/^\.\//u, '');
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
