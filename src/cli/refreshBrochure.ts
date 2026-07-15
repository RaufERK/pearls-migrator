import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBrochureSlug, resolveBrochureSource } from '../brochureSource.js';

type RefreshOptions = {
  slug: string;
  withAi: boolean;
  forceAi: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));
const brochure = await resolveBrochureSource(rootDir, options.slug);

console.log(`Refresh brochure ${brochure.slug}`);
console.log(`Source: ${brochure.sourceRelativePath} (${brochure.extension})`);

if (brochure.extension === '.pdf') {
  console.log(options.withAi ? 'Mode: parse:pdf + AI + downloads + seed' : 'Mode: parse:pdf + downloads + seed (no AI)');
  await runNpm('parse:pdf', ['--', `--slug=${brochure.slug}`]);
} else {
  console.log(options.withAi ? 'Mode: prepare + parse + AI + downloads + seed' : 'Mode: prepare + parse + downloads + seed (no AI)');
  await runNpm('prepare:docx', ['--', `--slug=${brochure.slug}`, '--force']);
  await runNpm('parse:word', ['--', `--file=${brochure.preparedDocxRelativePath}`]);
}

if (options.withAi) {
  const aiArgs = ['--', `--file=${toProjectRelative(brochure.parsedJsonPath)}`, '--write'];

  if (options.forceAi) {
    aiArgs.push('--force');
  }

  await runNpm('metadata:ai', aiArgs);
} else {
  console.log('Skipped metadata:ai (pass without --parse-only to run AI)');
}

await runNpm('generate:downloads', ['--', `--slug=${brochure.slug}`]);
await runNpm('verify:downloads', ['--', `--slug=${brochure.slug}`]);
await runNpm('db:seed', []);

console.log(`\nDone refresh ${brochure.slug}. Review page + downloads, then npm run deploy when ready.`);

function parseArgs(args: string[]): RefreshOptions {
  const options: RefreshOptions = {
    slug: '',
    withAi: true,
    forceAi: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--parse-only' || arg === '--skip-ai') {
      options.withAi = false;
      continue;
    }

    if (arg === '--force' || arg === '--force-ai') {
      options.forceAi = true;
      options.withAi = true;
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

    if (!arg.startsWith('-') && !options.slug) {
      options.slug = parseBrochureSlug(arg).slug;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.slug) {
    printHelp();
    throw new Error('Slug is required, e.g. npm run refresh -- 2011Q4-1');
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run refresh -- <slug> [options]',
    '',
    'Re-prepare/re-parse and rebuild downloads for one replaced source brochure.',
    'Word (.doc/.docx): prepare:docx → parse:word.',
    'PDF: parse:pdf (pdfjs, two-column aware). Original PDF is kept for download.',
    '',
    'Default steps:',
    '  Word: prepare:docx --force → parse:word',
    '  PDF:  parse:pdf --slug',
    '  then: metadata:ai → generate:downloads → verify → db:seed',
    '',
    'Options:',
    '  --parse-only / --skip-ai   Skip AI titles (still rebuilds downloads + seed)',
    '  --force / --force-ai       Re-ask the model even when titles already exist',
    '  --slug <slug>              Explicit slug (same as positional)',
    '  --help                     Show this help',
    '',
    'Examples:',
    '  npm run refresh -- 2011Q4-1',
    '  npm run refresh -- 2011Q4-1 --parse-only',
    '  npm run refresh -- 2011Q4-1 --force',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function toProjectRelative(absolutePath: string): string {
  return absolutePath.startsWith(rootDir) ? absolutePath.slice(rootDir.length + 1) : absolutePath;
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
