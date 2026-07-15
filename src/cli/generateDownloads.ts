import { parseBrochureSlug } from '../brochureSource.js';
import { loadDownloadCatalogFromParsed } from '../downloadCatalog.js';
import { generateDownloads } from '../downloads.js';

type CliOptions = {
  year: string | null;
  slug: string | null;
};

const rootDir = process.cwd();
const options = parseArgs(process.argv.slice(2));

try {
  const items = await loadDownloadCatalogFromParsed(rootDir, options.year, options.slug);

  await generateDownloads(rootDir, items);

  const scope = [
    options.slug ? `slug ${options.slug}` : null,
    options.year ? `year ${options.year}` : null,
  ].filter(Boolean).join(', ');

  console.log(`Generated downloads for ${items.length} pearls${scope ? ` (${scope})` : ''}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    year: null,
    slug: null,
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

    if (arg.startsWith('--slug=')) {
      options.slug = parseBrochureSlug(arg.slice('--slug='.length)).slug;
      continue;
    }

    if (arg === '--slug') {
      options.slug = parseBrochureSlug(readNextArg(args, index, '--slug')).slug;
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
    'Copies source PDFs from local SOURCE_PERALS (mailing, then print, then word/*.pdf).',
    'If no source PDF exists, converts Word/DOCX via LibreOffice.',
    'Also builds TXT/DOCX/EPUB into web/public/downloads/.',
    'Never run this on production.',
    '',
    'Options:',
    '  --year <year>       Generate downloads only for one site year',
    '  --slug <slug>       Generate downloads only for one brochure, e.g. 2011Q4-1',
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
