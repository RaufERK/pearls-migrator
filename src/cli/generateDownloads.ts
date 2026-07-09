import { loadDownloadCatalogFromParsed } from '../downloadCatalog.js';
import { generateDownloads } from '../downloads.js';

type CliOptions = {
  year: string | null;
};

const rootDir = process.cwd();
const options = parseArgs(process.argv.slice(2));

try {
  const items = await loadDownloadCatalogFromParsed(rootDir, options.year);

  await generateDownloads(rootDir, items);

  console.log(`Generated downloads for ${items.length} pearls${options.year ? ` (year ${options.year})` : ''}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    year: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('--year=')) {
      options.year = arg.slice('--year='.length);
      continue;
    }

    if (arg === '--year') {
      options.year = readNextArg(args, index, '--year');
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.year !== null && !/^(?:19|20)\d{2}$/u.test(options.year)) {
    throw new Error(`Invalid --year value: ${options.year}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run generate:downloads -- [options]',
    '',
    'Reads reviewed JSON from data/parsed/ (no Postgres required).',
    'Copies source PDFs from local SOURCE_PERALS and builds TXT/DOCX/EPUB',
    'into web/public/downloads/. Never run this on production.',
    '',
    'Options:',
    '  --year <year>       Generate downloads only for one site year',
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
