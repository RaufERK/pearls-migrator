import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { CONSULTANT_KIT_SOURCES, copiedSource, selectParagraphContractCases } from './consultantKit.js';
import { loadCorpusRecords } from './corpusExport.js';

const rootDir = resolve(import.meta.dirname, '..');

describe('consultant kit', () => {
  it('lists source files that exist in this repository', async () => {
    for (const relativePath of CONSULTANT_KIT_SOURCES) {
      await access(resolve(rootDir, relativePath));
    }
  });

  it('stamps copied sources with the source commit and does not stack headers', () => {
    const once = copiedSource('export const value = 1;\n', 'abc123');
    const twice = copiedSource(once, 'def456');

    assert.equal(twice, '// скопировано из pearls-migrator, коммит def456\n\nexport const value = 1;\n');
  });

  it('builds paragraph fixtures for separators, triple newlines, and trailing spaces', async () => {
    const cases = selectParagraphContractCases(await loadCorpusRecords(rootDir));

    assert.deepEqual(cases.map((item) => item.reason), ['separator', 'triple-newline', 'trailing-space']);

    for (const item of cases) {
      assert.equal(item.paragraphs.length > 0, true);
      assert.deepEqual(
        item.paragraphs.map((paragraph) => paragraph.anchorId),
        item.paragraphs.map((paragraph) => `d${item.position}-p${paragraph.number}`),
      );
    }
  });
});
