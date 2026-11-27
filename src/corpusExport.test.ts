import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { readPearlDocument } from './catalog.js';
import { listParsedJsonFiles } from './catalogRows.js';
import { toBody } from './catalogLabels.js';
import {
  EXPECTED_CORPUS_DOCUMENTS,
  EXPECTED_CORPUS_PARAGRAPHS,
  EXPECTED_CORPUS_PEARLS,
  corpusCounts,
  loadCorpusRecords,
  selectSampleRecords,
} from './corpusExport.js';
import { numberedParagraphs } from './paragraphContract.js';

const rootDir = resolve(import.meta.dirname, '..');

describe('corpus export', () => {
  it('validates the full parsed corpus and keeps paragraph numbers aligned with toBody', async () => {
    const jsonPaths = await listParsedJsonFiles(resolve(rootDir, 'data/parsed'));
    const records = await loadCorpusRecords(rootDir);
    const counts = corpusCounts(records);

    assert.equal(jsonPaths.length, EXPECTED_CORPUS_PEARLS);
    assert.deepEqual(counts, {
      pearls: EXPECTED_CORPUS_PEARLS,
      documents: EXPECTED_CORPUS_DOCUMENTS,
      paragraphs: EXPECTED_CORPUS_PARAGRAPHS,
    });

    for (const jsonPath of jsonPaths) {
      const document = await readPearlDocument(jsonPath);

      for (const innerDocument of document.documents) {
        const bodyTexts = innerDocument.parts.body.map((paragraph) => paragraph.text);
        const content = bodyTexts.join('\n\n');
        const paragraphs = toBody(content).map((paragraph) => paragraph.text);

        assert.deepEqual(paragraphs, bodyTexts);
        assert.equal(paragraphs.some((text) => text.trim().length === 0), false);
      }
    }

    for (const record of records) {
      assert.equal(record.paragraphsCount, numberedParagraphs(record.content).length);
      assert.equal(numberedParagraphs(record.content).some((paragraph) => paragraph.text.trim().length === 0), false);
    }

    for (let index = 1; index < records.length; index += 1) {
      const previous = records[index - 1];
      const current = records[index];

      if (!previous || !current) {
        continue;
      }

      const order = previous.siteSortDate.localeCompare(current.siteSortDate)
        || previous.slug.localeCompare(current.slug)
        || previous.position - current.position;

      assert.equal(order <= 0, true);
    }
  });

  it('selects whole issues for a sample', async () => {
    const records = await loadCorpusRecords(rootDir);
    const sample = selectSampleRecords(records, 5);
    const slugs = [...new Set(sample.map((record) => record.slug))];

    assert.equal(slugs.length, 5);
    assert.deepEqual(sample, records.filter((record) => slugs.includes(record.slug)));
  });
});
