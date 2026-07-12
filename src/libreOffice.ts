import { access, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { basename, extname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** LibreOffice rejects concurrent conversions that share a user profile. */
let libreOfficeQueue: Promise<void> = Promise.resolve();

export async function resolveSofficePath(): Promise<string> {
  const candidates = [
    'soffice',
    'libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['--version']);

      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('LibreOffice was not found. Install it or make soffice available in PATH.');
}

/**
 * Convert a document with LibreOffice into `outputPath`.
 * Conversion runs in `tempDir` (recreated), then the produced file is copied to `outputPath`.
 * Calls are serialized so LibreOffice does not collide on its user profile.
 */
export async function convertWithLibreOffice(options: {
  sofficePath: string;
  sourcePath: string;
  outputPath: string;
  targetExtension: 'docx' | 'pdf';
  tempDir: string;
  cwd: string;
  sourceLabel?: string;
}): Promise<void> {
  const run = libreOfficeQueue.then(() => convertWithLibreOfficeUnlocked(options));
  libreOfficeQueue = run.then(() => undefined, () => undefined);
  await run;
}

async function convertWithLibreOfficeUnlocked(options: {
  sofficePath: string;
  sourcePath: string;
  outputPath: string;
  targetExtension: 'docx' | 'pdf';
  tempDir: string;
  cwd: string;
  sourceLabel?: string;
}): Promise<void> {
  const {
    sofficePath,
    sourcePath,
    outputPath,
    targetExtension,
    tempDir,
    cwd,
    sourceLabel = sourcePath,
  } = options;
  const expectedName = `${basename(sourcePath, extname(sourcePath))}.${targetExtension}`;

  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  try {
    await execFileAsync(
      sofficePath,
      ['--headless', '--convert-to', targetExtension, '--outdir', tempDir, sourcePath],
      { cwd },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`LibreOffice failed to convert ${sourceLabel}: ${detail}`);
  }

  const producedPath = await resolveConvertedOutputPath(tempDir, expectedName, targetExtension);

  if (!producedPath) {
    const produced = await readdir(tempDir).catch(() => [] as string[]);
    throw new Error(
      `LibreOffice did not produce a .${targetExtension} for ${sourceLabel}. `
      + `Expected ${expectedName} in ${tempDir}. Produced: ${produced.length > 0 ? produced.join(', ') : '(empty)'}`,
    );
  }

  await access(producedPath);
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await cp(producedPath, outputPath, { force: true });
}

async function resolveConvertedOutputPath(
  tempDir: string,
  expectedName: string,
  targetExtension: string,
): Promise<string | null> {
  const expectedPath = resolve(tempDir, expectedName);

  try {
    await access(expectedPath);
    return expectedPath;
  } catch {
    // LibreOffice sometimes rewrites the output basename; accept the sole match if present.
  }

  const extension = `.${targetExtension}`;
  const produced = (await readdir(tempDir)).filter((name) => extname(name).toLowerCase() === extension);

  if (produced.length === 1) {
    return resolve(tempDir, produced[0]);
  }

  return null;
}
