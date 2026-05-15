import { readdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectPdfColumnCount } from '../pdf/extractPearl.js';
import { readPdfProcessingMap, upsertPdfProcessingEntry, writePdfProcessingMap } from '../pdf/processingMap.js';

type ProfileOptions = {
  files: string[];
  years: string[];
  force: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));
const pdfPaths = filterPdfPaths(await listPdfFiles(rootDir, resolve(rootDir, 'pearls')), options);
let processingMap = await readPdfProcessingMap();

console.log(`Profiling ${pdfPaths.length} PDF files`);

for (const pdfPath of pdfPaths) {
  const existingEntry = processingMap.files?.[pdfPath.replace(/\\/g, '/')];

  if (existingEntry?.columns && !options.force) {
    console.log(`Skipped ${pdfPath}: columns already set to ${existingEntry.columns}`);
    continue;
  }

  const columns = await detectPdfColumnCount(resolve(rootDir, pdfPath));
  processingMap = upsertPdfProcessingEntry(processingMap, pdfPath, { columns });

  console.log(`Profiled ${pdfPath}: ${columns} column${columns === 1 ? '' : 's'}`);
}

await writePdfProcessingMap(processingMap);
console.log('Saved data/pdf-processing-map.json');

function parseArgs(args: string[]): ProfileOptions {
  const options: ProfileOptions = {
    files: [],
    years: [],
    force: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--force') {
      options.force = true;
      continue;
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
    'Usage: npm run pdf:profile -- [options]',
    '',
    'Options:',
    '  --year <year>       Profile only PDFs from pearls/<year>',
    '  --file <path>       Profile one PDF file',
    '  --force             Re-detect and overwrite existing file-level columns',
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

function filterPdfPaths(pdfPaths: string[], options: ProfileOptions): string[] {
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

  return normalized.replace(/^\.\//u, '').replace(/\\/g, '/');
}

async function listPdfFiles(rootPath: string, dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dirPath, entry.name);

      if (entry.isDirectory()) {
        return listPdfFiles(rootPath, entryPath);
      }

      return entry.isFile() && entry.name.toLowerCase().endsWith('.pdf') ? [relative(rootPath, entryPath).replace(/\\/g, '/')] : [];
    }),
  );

  return files.flat().sort();
}
