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
console.log(options.withAi ? 'Mode: prepare + parse + metadata' : 'Mode: prepare + parse only');

await runNpm('prepare:docx', ['--', `--year=${options.year}`]);
await runNpm('parse:word', ['--', `--year=${options.year}`]);

if (options.withAi) {
  const metadataArgs = ['--', `--year=${options.year}`];

  if (options.forceAi) {
    metadataArgs.push('--force');
  }

  await runNpm('metadata', metadataArgs);
} else {
  console.log('Skipped metadata (pass without --parse-only to run AI, or: npm run metadata -- --year=...)');

  if (options.withDownloads) {
    await runNpm('generate:downloads', ['--', `--year=${options.year}`]);
  } else {
    console.log('Skipped generate:downloads (run full year pipeline, or: npm run metadata)');
  }
}

console.log(`\nDone year ${options.year}.${options.withAi ? ' Review data/parsed, then npm run deploy when ready.' : ' Next: npm run metadata -- --year=' + options.year}`);

function parseArgs(args: string[]): ContentYearOptions {
  const options: ContentYearOptions = {
    year: '',
    withAi: true,
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

    if (arg === '--parse-only' || arg === '--skip-ai') {
      options.withAi = false;
      continue;
    }

    if (arg === '--with-downloads') {
      options.withDownloads = true;
      continue;
    }

    if (arg === '--force-ai' || arg === '--force') {
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
    throw new Error('Year is required, e.g. npm run year -- 2017');
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run year -- <year> [options]',
    '   or: npm run content:year -- <year> [options]',
    '',
    'Local-only content pipeline for one archive year.',
    'Does not touch production and does not require SOURCE_PERALS on the server.',
    '',
    'Default steps (full pipeline):',
    '  1. prepare:docx --year <year>',
    '  2. parse:word --year <year>',
    '  3. metadata --year <year>   (AI + downloads + seed; VPN required)',
    '',
    'Options:',
    '  --parse-only / --skip-ai   Stop after parse (no AI / downloads / seed)',
    '  --force / --force-ai       Re-ask the model even when titles already exist',
    '  --with-downloads           After --parse-only, also generate downloads',
    '  --with-ai                  Explicit full pipeline (default; kept for compatibility)',
    '  --help                     Show this help',
    '',
    'Examples:',
    '  npm run year -- 2017',
    '  npm run year -- 2017 --force',
    '  npm run year -- 2017 --parse-only',
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
