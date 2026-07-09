import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ContentYearOptions = {
  year: string;
  withAi: boolean;
  withDownloads: boolean;
  forceAi: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));

console.log(`Content pipeline for year ${options.year}`);
console.log('SOURCE_PERALS stays local; production never needs the source archive.');

await runNpm('prepare:docx', ['--', `--year=${options.year}`]);
await runNpm('parse:word', ['--', `--year=${options.year}`]);

if (options.withAi) {
  const aiArgs = ['--', `--year=${options.year}`, '--write'];

  if (options.forceAi) {
    aiArgs.push('--force');
  }

  await runNpm('metadata:ai', aiArgs);
} else {
  console.log('Skipped metadata:ai (pass --with-ai only for documents that still lack titles)');
}

if (options.withDownloads) {
  await runNpm('generate:downloads', ['--', `--year=${options.year}`]);
} else {
  console.log('Skipped generate:downloads (review data/parsed first, then run with --with-downloads)');
}

console.log(`\nDone year ${options.year}. Next: review data/parsed/${options.year}/, then deploy:content when ready.`);

function parseArgs(args: string[]): ContentYearOptions {
  const options: ContentYearOptions = {
    year: '',
    withAi: false,
    withDownloads: false,
    forceAi: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--with-ai') {
      options.withAi = true;
      continue;
    }

    if (arg === '--with-downloads') {
      options.withDownloads = true;
      continue;
    }

    if (arg === '--force-ai') {
      options.forceAi = true;
      options.withAi = true;
      continue;
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

    if (/^(?:19|20)\d{2}$/u.test(arg) && !options.year) {
      options.year = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!/^(?:19|20)\d{2}$/u.test(options.year)) {
    printHelp();
    throw new Error('Year is required, e.g. npm run content:year -- 2019');
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run content:year -- <year> [options]',
    '',
    'Local-only content pipeline for one archive year.',
    'Does not touch production and does not require SOURCE_PERALS on the server.',
    '',
    'Default steps:',
    '  1. prepare:docx --year <year>',
    '  2. parse:word --year <year>',
    '',
    'Options:',
    '  --with-ai           Also run metadata:ai for that year (usually run it as a separate step after review)',
    '  --force-ai          Same as --with-ai, but re-asks the model even when titles exist',
    '  --with-downloads    Generate web/public/downloads for that year after parse',
    '  --help              Show this help',
    '',
    'Typical Cursor flow for a new year:',
    '  npm run content:year -- 2019',
    '  # review data/parsed/2019/',
    '  npm run metadata:ai -- --year=2019 --write   # always for new year data;',
    '                                              # skips docs that already have titles',
    '  npm run generate:downloads -- --year=2019',
    '  npm run deploy:content',
    '',
    'See WORK-FLOW.md for the full operator guide.',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function runNpm(script: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    console.log(`\n> npm run ${script} ${args.join(' ')}`.trim());

    const child = spawn('npm', ['run', script, ...args], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`npm run ${script} exited with code ${code ?? 'unknown'}`));
    });
  });
}
