export type CorpusPushTarget = {
  sshHost: string;
  inbox: string;
  cwd: string;
  ingestCommand: string;
};

const SAFE_HOST = /^[A-Za-z0-9_.-]+$/u;
const SAFE_PATH = /^\/[A-Za-z0-9_./-]+$/u;
const CORPUS_FILE = /^corpus-\d{8}T\d{6}Z\.ndjson\.gz$/u;

export function readCorpusPushTarget(env: NodeJS.ProcessEnv): CorpusPushTarget {
  const sshHost = env.CORPUS_PUSH_SSH ?? 'amster_app';
  const inbox = env.CORPUS_PUSH_INBOX ?? '/home/appuser/apps/amasters-ai/shared/corpus/inbox';
  const cwd = env.CORPUS_PUSH_CWD ?? '/home/appuser/apps/amasters-ai/current';
  const ingestCommand = env.CORPUS_INGEST_COMMAND;

  if (!ingestCommand) {
    throw new Error('CORPUS_INGEST_COMMAND is required to send the corpus. Example: npm run ingest -- --file {file}');
  }

  if (!ingestCommand.includes('{file}')) {
    throw new Error('CORPUS_INGEST_COMMAND must contain {file}');
  }

  if (!SAFE_HOST.test(sshHost) || !SAFE_PATH.test(inbox) || !SAFE_PATH.test(cwd)) {
    throw new Error('Corpus push host or path is not a plain SSH alias or absolute path');
  }

  return { sshHost, inbox, cwd, ingestCommand };
}

export function corpusManifestName(gzName: string): string {
  if (!gzName.endsWith('.ndjson.gz')) {
    throw new Error(`Unexpected corpus file name: ${gzName}`);
  }

  return `${gzName.slice(0, -'.ndjson.gz'.length)}.manifest.json`;
}

export function rsyncArgs(target: CorpusPushTarget, directory: string, gzName: string): string[] {
  assertCorpusFile(gzName);

  return [
    '-az',
    `${directory}/${gzName}`,
    `${directory}/${corpusManifestName(gzName)}`,
    `${target.sshHost}:${target.inbox}/`,
  ];
}

export function ingestRemoteCommand(target: CorpusPushTarget, gzName: string): string {
  assertCorpusFile(gzName);

  return `cd ${target.cwd} && ${target.ingestCommand.replaceAll('{file}', gzName)}`;
}

function assertCorpusFile(gzName: string): void {
  if (!CORPUS_FILE.test(gzName)) {
    throw new Error(`Unexpected corpus file name: ${gzName}`);
  }
}
