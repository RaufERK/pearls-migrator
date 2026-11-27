import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { readPearlDocument } from './catalog.js';
import { toPearlData } from './catalogRows.js';
import type { PearlDocument } from './types.js';

const rootDir = resolve(import.meta.dirname, '..');

describe('toPearlData', () => {
  it('keeps site publication and paragraph joins for reviewed issues', async () => {
    for (const relativePath of ['data/parsed/2026/2026Q2-3.json', 'data/parsed/2006/2006Q1-1.json', 'data/parsed/2011/2011Q3-1.json']) {
      const jsonPath = resolve(rootDir, relativePath);
      const document = await readPearlDocument(jsonPath);
      const row = toPearlData(document, jsonPath, rootDir);

      assert.equal(row.slug, document.slug);
      assert.equal(row.title, document.title);
      assert.equal(row.siteLabel, document.sitePublication.label);
      assert.equal(row.siteYear, document.sitePublication.year);
      assert.equal(row.siteMonth, document.sitePublication.month);
      assert.equal(row.siteSortDate, document.sitePublication.sortDate);
      assert.equal(row.documents.create.length, document.documents.length);
      assert.equal(row.jsonPath, relativePath);

      document.documents.forEach((innerDocument, index) => {
        const stored = row.documents.create[index];

        if (!stored) {
          throw new Error(`Missing document ${index} in ${document.slug}`);
        }

        assert.equal(stored.position, index + 1);
        assert.equal(stored.id, `${document.slug}-${index + 1}`);
        assert.equal(stored.paragraphsCount, innerDocument.parts.body.length);
        assert.equal(stored.content, innerDocument.parts.body.map((paragraph) => paragraph.text).join('\n\n'));
      });
    }
  });

  it('derives the site month from a quarter file name when publication is empty', () => {
    const document = {
      slug: '2014Q2-1',
      title: 'Жемчужины Мудрости',
      sitePublication: {
        label: null,
        rawLabel: null,
        year: null,
        month: null,
        months: [],
        sortDate: null,
      },
      documentsCount: 0,
      documents: [],
      sourcePdf: 'word/2014/2014Q2-1.pdf',
      sourceWord: 'word/2014/2014Q2-1.docx',
      jsonPath: 'data/parsed/2014/2014Q2-1.json',
      parsedAt: '2026-01-01T00:00:00.000Z',
      meta: { pages: 1, layout: 'single-column' },
    } satisfies PearlDocument;
    const row = toPearlData(document, resolve(rootDir, document.jsonPath), rootDir);

    assert.equal(row.siteYear, 2014);
    assert.equal(row.siteMonth, 4);
    assert.deepEqual(row.siteMonths, ['2014-04']);
    assert.equal(row.siteSortDate, '2014-04-01');
    assert.equal(row.siteLabel, null);
  });
});
