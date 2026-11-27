import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { config } from 'dotenv';

import { corpusCounts, loadCorpusRecords, selectSampleRecords, writeCorpusExport } from '../corpusExport.js';
import { ingestRemoteCommand, readCorpusPushTarget, rsyncArgs } from '../corpusDelivery.js';

config({ path: resolve(process.cwd(), '.env') });

const rootDir = process.cwd();

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.sample !== null && !options.dryRun) {
    throw new Error('Refusing to send a sample. Omit --sample or pass --dry-run.');
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

  console.log(`Corpus ${options.dryRun ? 'dry-run' : 'export'}: ${counts.pearls} pearls, ${counts.documents} documents, ${counts.paragraphs} paragraphs`);
  console.log(resolve(directory, manifest.file));

  if (!options.dryRun) {
    const target = readCorpusPushTarget(process.env);
    const rsyncStatus = await run('rsync', rsyncArgs(target, directory, manifest.file));

    if (rsyncStatus !== 0) {
      throw new Error(`rsync failed with status ${rsyncStatus}`);
    }

    const ingestStatus = await run('ssh', [target.sshHost, ingestRemoteCommand(target, manifest.file)]);

    if (ingestStatus !== 0) {
      throw new Error(`ingest refused the corpus (status ${ingestStatus})`);
    }

    console.log('Corpus ingest finished');
  }
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

function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('close', (code) => {
      resolvePromise(code ?? 1);
    });
  });
}
