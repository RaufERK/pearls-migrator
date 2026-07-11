import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type MetadataPipelineOptions = {
  year: string;
  force: boolean;
  dryRun: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));

console.log(`Metadata pipeline for year ${options.year}`);
console.log(options.dryRun ? 'Mode: dry-run (AI only, no write / downloads / seed)' : 'Mode: write + downloads + seed');

const aiArgs = ['--', `--year=${options.year}`];

if (!options.dryRun) {
  aiArgs.push('--write');
}

if (options.force) {
  aiArgs.push('--force');
}

await runNpm('metadata:ai', aiArgs);

if (options.dryRun) {
  console.log('\nDry-run complete. Skipped generate:downloads and db:seed.');
  process.exit(0);
}

await runNpm('generate:downloads', ['--', `--year=${options.year}`]);
await runNpm('db:seed', []);

console.log(`\nDone year ${options.year}. Local site catalog and downloads are up to date.`);
console.log('When ready: commit data/parsed, then npm run deploy');

function parseArgs(args: string[]): MetadataPipelineOptions {
  const options: MetadataPipelineOptions = {
    year: '',
    force: false,
    dryRun: false,
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

    if (arg === '--dry-run') {
      options.dryRun = true;
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
    throw new Error('Year is required, e.g. npm run metadata -- --year=2019');
  }

  return options;
}

function printHelp(): void {
  console.log(
    [
      'Usage: npm run metadata -- --year=<year> [options]',
      '',
      'Assert AI titles for one year, then generate downloads and seed the local DB.',
      'From Russia you MUST run VPN before this command.',
      '',
      'Default steps:',
      '  1. metadata:ai --year <year> --write',
      '  2. generate:downloads --year <year>',
      '  3. db:seed',
      '',
      'Options:',
      '  --year <year>   Required year under data/parsed/<year>',
      '  --force         Re-ask the model even when titles already exist',
      '  --dry-run       AI dry-run only (no write, downloads, or seed)',
      '  --help          Show this help',
      '',
      'Examples:',
      '  npm run metadata -- --year=2019',
      '  npm run metadata -- --year=2019 --force',
      '  npm run metadata -- 2019 --dry-run',
      '',
      'Low-level AI-only (no downloads/seed): npm run metadata:ai -- --year=2019 --write',
      'See WORK-FLOW.md for the full operator guide.',
    ].join('\n'),
  );
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
