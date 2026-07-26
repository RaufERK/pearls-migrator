import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractPartTitle } from './catalogLabels.js';

describe('extractPartTitle', () => {
  it('returns the standalone part line from the header', () => {
    assert.equal(
      extractPartTitle(['Январь 2020', 'Второй семинар', 'Часть II']),
      'Часть II',
    );
  });

  it('returns null when the part is already folded into documentTitle', () => {
    assert.equal(
      extractPartTitle(
        [
          'Январь 2025',
          'Курс лекций Э. К. Профет по Евангелию от Фомы',
          'Часть VII',
        ],
        'Курс лекций Э. К. Профет по Евангелию от Фомы (Часть VII)',
      ),
      null,
    );
  });

  it('keeps the secondary part line when documentTitle has no part', () => {
    assert.equal(
      extractPartTitle(
        ['Июль 2020', 'Второй семинар по психологии', 'Часть II'],
        'Второй семинар по психологии',
      ),
      'Часть II',
    );
  });

  it('returns null when header has no part line', () => {
    assert.equal(
      extractPartTitle(['Диктовка', 'Возлюбленный Эль Мория'], 'Диктовка'),
      null,
    );
  });
});
