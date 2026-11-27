import { resolve } from 'node:path';

import { loadCorpusRecords, selectSampleRecords, writeCorpusExport, corpusCounts } from '../corpusExport.js';

const rootDir = process.cwd();

try {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dryRun) {
    throw new Error('Sending the corpus is not enabled yet. Re-run with --dry-run.');
  }

  const records = options.sample === null
    ? await loadCorpusRecords(rootDir)
    : selectSampleRecords(await loadCorpusRecords(rootDir), options.sample);
  const createdAt = new Date();
  const directory = resolve(rootDir, 'consultant-kit/corpus');
  const manifest = await writeCorpusExport({
    records,
    directory,
    createdAt,
    filePrefix: options.sample === null ? 'corpus' : 'corpus-sample',
  });
  const counts = corpusCounts(records);

  console.log(`Corpus dry-run: ${counts.pearls} pearls, ${counts.documents} documents, ${counts.paragraphs} paragraphs`);
  console.log(`${resolve(directory, manifest.file)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function parseArgs(args: string[]): { dryRun: boolean; sample: number | null } {
  let dryRun = false;
  let sample: number | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--sample') {
      const raw = args[index + 1];
      index += 1;
      const value = Number(raw);

      if (!raw || !Number.isInteger(value) || value < 1) {
        throw new Error('--sample expects a positive integer');
      }

      sample = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, sample };
}
