import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { buildConsultantKit } from '../consultantKit.js';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();

try {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: rootDir });
  const commit = stdout.trim();

  await buildConsultantKit(rootDir, commit);
  console.log(`Consultant kit written to ${resolve(rootDir, 'consultant-kit')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
