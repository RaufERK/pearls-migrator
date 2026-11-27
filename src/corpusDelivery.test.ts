import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { corpusManifestName, ingestRemoteCommand, readCorpusPushTarget, rsyncArgs } from './corpusDelivery.js';

const target = {
  CORPUS_INGEST_COMMAND: 'npm run ingest -- --file {file}',
};

describe('corpus delivery', () => {
  it('builds an rsync and ingest command for a full corpus file', () => {
    const destination = readCorpusPushTarget(target);
    const fileName = 'corpus-20261127T074508Z.ndjson.gz';

    assert.equal(destination.sshHost, 'amster_app');
    assert.equal(corpusManifestName(fileName), 'corpus-20261127T074508Z.manifest.json');
    assert.deepEqual(rsyncArgs(destination, '/tmp/corpus', fileName), [
      '-az',
      '/tmp/corpus/corpus-20261127T074508Z.ndjson.gz',
      '/tmp/corpus/corpus-20261127T074508Z.manifest.json',
      'amster_app:/home/appuser/apps/amasters-ai/shared/corpus/inbox/',
    ]);
    assert.equal(
      ingestRemoteCommand(destination, fileName),
      'cd /home/appuser/apps/amasters-ai/current && npm run ingest -- --file corpus-20261127T074508Z.ndjson.gz',
    );
  });

  it('refuses a missing command, a command without {file}, and a sample file', () => {
    assert.throws(() => readCorpusPushTarget({}), /CORPUS_INGEST_COMMAND is required/);
    assert.throws(() => readCorpusPushTarget({ CORPUS_INGEST_COMMAND: 'npm run ingest' }), /\{file\}/);
    assert.throws(() => readCorpusPushTarget({ ...target, CORPUS_PUSH_SSH: 'amster app' }), /plain SSH alias/);

    const destination = readCorpusPushTarget(target);

    assert.throws(() => ingestRemoteCommand(destination, 'corpus-sample-20261127T074508Z.ndjson.gz'), /Unexpected corpus file name/);
  });
});
