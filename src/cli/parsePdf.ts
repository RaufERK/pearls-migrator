import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBrochureSlug, resolveBrochureSource } from '../brochureSource.js';
import { extractPdfPearlDocument } from '../pdf/extractPdfPearl.js';

type ParsePdfOptions = {
  files: string[];
  slugs: string[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const options = parseArgs(process.argv.slice(2));
const jobs = await resolveJobs(options);

if (jobs.length === 0) {
  printHelp();
  throw new Error('Provide --slug or --file pointing to a PDF source');
}

console.log(`Parsing ${jobs.length} PDF brochure(s)`);

for (const job of jobs) {
  const document = await extractPdfPearlDocument(job.sourcePath, {
    sourcePdf: job.sourceRelativePath,
    jsonPath: job.jsonRelativePath,
    rootDir,
  });

  await mkdir(dirname(job.outputPath), { recursive: true });
  await writeFile(job.outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  const paragraphsCount = document.documents.reduce((count, inner) => count + inner.parts.body.length, 0);

  console.log(`Parsed ${document.slug}: ${document.documents.length} documents, ${paragraphsCount} paragraphs`);
  console.log(`Layout: ${document.meta.layout}, pages: ${document.meta.pages}`);
  console.log(`Source PDF: ${job.sourceRelativePath}`);
  console.log(`Saved: ${job.outputPath}`);
}

type ParseJob = {
  sourcePath: string;
  sourceRelativePath: string;
  jsonRelativePath: string;
  outputPath: string;
};

async function resolveJobs(options: ParsePdfOptions): Promise<ParseJob[]> {
  const jobs: ParseJob[] = [];

  for (const slug of options.slugs) {
    const brochure = await resolveBrochureSource(rootDir, slug);

    if (brochure.extension !== '.pdf') {
      throw new Error(`Slug ${slug} resolves to ${brochure.extension}, not .pdf. Use parse:word for Word sources.`);
    }

    jobs.push({
      sourcePath: brochure.sourcePath,
      sourceRelativePath: brochure.sourceRelativePath,
      jsonRelativePath: toRelativePath(rootDir, brochure.parsedJsonPath),
      outputPath: brochure.parsedJsonPath,
    });
  }

  for (const file of options.files) {
    const sourcePath = isAbsolute(file) ? file : resolve(rootDir, file);

    if (!(await pathExists(sourcePath))) {
      throw new Error(`PDF file not found: ${file}`);
    }

    if (!sourcePath.toLowerCase().endsWith('.pdf')) {
      throw new Error(`Expected a .pdf file: ${file}`);
    }

    const brochure = await resolveBrochureSource(rootDir, parseBrochureSlug(basenameWithoutExt(sourcePath)).slug);

    jobs.push({
      sourcePath,
      sourceRelativePath: toRelativePath(rootDir, sourcePath),
      jsonRelativePath: toRelativePath(rootDir, brochure.parsedJsonPath),
      outputPath: brochure.parsedJsonPath,
    });
  }

  return jobs;
}

function parseArgs(args: string[]): ParsePdfOptions {
  const options: ParsePdfOptions = {
    files: [],
    slugs: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith('--slug=')) {
      options.slugs.push(parseBrochureSlug(arg.slice('--slug='.length)).slug);
      continue;
    }

    if (arg === '--slug') {
      options.slugs.push(parseBrochureSlug(readNextArg(args, index, '--slug')).slug);
      index += 1;
      continue;
    }

    if (arg.startsWith('--file=')) {
      options.files.push(arg.slice('--file='.length));
      continue;
    }

    if (arg === '--file') {
      options.files.push(readNextArg(args, index, '--file'));
      index += 1;
      continue;
    }

    if (!arg.startsWith('-')) {
      options.slugs.push(parseBrochureSlug(arg).slug);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log([
    'Usage: npm run parse:pdf -- --slug <slug> | --file <path.pdf>',
    '',
    'Parses a PDF brochure with pdfjs (two-column aware) into data/parsed/.',
    'Do not use LibreOffice PDF→DOCX for content.',
    '',
    'Options:',
    '  --slug <slug>     Brochure slug, e.g. 2011Q4-1',
    '  --file <path>     Path to a PDF under SOURCE_PERALS',
    '  --help            Show this help',
  ].join('\n'));
}

function readNextArg(args: string[], index: number, name: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function basenameWithoutExt(filePath: string): string {
  const base = filePath.split(/[\\/]/u).at(-1) ?? filePath;

  return base.replace(/\.pdf$/iu, '');
}

function toRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}
