import { access } from 'node:fs/promises';

import { parseBrochureSlug } from '../brochureSource.js';
import { loadDownloadCatalogFromParsed } from '../downloadCatalog.js';
import { downloadFormats, getDownloadPath, type DownloadFormat } from '../downloads.js';

type CliOptions = {
  year: string | null;
  slug: string | null;
};

type MissingDownload = {
  slug: string;
  year: string;
  format: DownloadFormat;
  path: string;
};

const rootDir = process.cwd();
const options = parseArgs(process.argv.slice(2));

try {
  const items = await loadDownloadCatalogFromParsed(rootDir, options.year, options.slug);
  const missing: MissingDownload[] = [];

  for (const item of items) {
    for (const format of downloadFormats) {
      const path = getDownloadPath(rootDir, item, format);

      if (!(await pathExists(path))) {
        missing.push({
          slug: item.slug,
          year: item.year,
          format,
          path,
        });
      }
    }
  }

  const expectedCount = items.length * downloadFormats.length;
  const scope = [
    options.slug ? `slug ${options.slug}` : null,
    options.year ? `year ${options.year}` : null,
  ].filter(Boolean).join(', ');

  if (missing.length === 0) {
    console.log(
      `Downloads OK: ${items.length} pearls × ${downloadFormats.length} formats`
      + ` = ${expectedCount} files`
      + (scope ? ` (${scope})` : ' (all parsed years)'),
    );
    process.exit(0);
  }

  console.error(
    `Missing ${missing.length} of ${expectedCount} download file(s)`
    + (scope ? ` for ${scope}` : ' across all parsed years')
    + ':',
  );

  for (const entry of missing) {
    console.error(`  ${entry.slug}.${entry.format}  (${entry.path})`);
  }

  process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
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
    'Usage: npm run verify:downloads -- [options]',
    '',
    'Checks that every pearl in data/parsed/ has all download formats',
    '(pdf, txt, docx, epub) under web/public/downloads/.',
    'By default checks ALL parsed years (full site catalog).',
    '',
    'Options:',
    '  --year <year>       Limit check to one site year (optional)',
    '  --slug <slug>       Limit check to one brochure, e.g. 2011Q4-1',
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
