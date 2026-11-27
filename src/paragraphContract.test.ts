import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { anchorId, numberedParagraphs, paragraphId, paragraphUrl } from './paragraphContract.js';

describe('paragraph contract', () => {
  it('numbers paragraphs through toBody, keeping separators and trailing spaces', () => {
    const content = 'Первый абзац \n\n\n_____\n\nТретий';
    const paragraphs = numberedParagraphs(content);

    assert.deepEqual(paragraphs, [
      { number: 1, text: 'Первый абзац ' },
      { number: 2, text: '_____' },
      { number: 3, text: 'Третий' },
    ]);
    assert.equal(anchorId(1, 3), 'd1-p3');
    assert.equal(paragraphId('2026Q2-3', 1, 3), 'pearls:2026Q2-3#d1-p3');
    assert.equal(paragraphUrl(2026, '2026Q2-3', 1, 3), 'https://amasters.ru/pearls/2026/2026Q2-3#d1-p3');
  });

  it('drops paragraphs that are only whitespace', () => {
    assert.deepEqual(numberedParagraphs('A\n\n   \n\nB'), [
      { number: 1, text: 'A' },
      { number: 2, text: 'B' },
    ]);
  });
});
