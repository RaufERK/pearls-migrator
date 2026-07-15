import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  detectPageLayout,
  pageToLines,
  pdfLinesToParagraphs,
  type PdfPageText,
  type PositionedTextItem,
} from './extractPdfLines.js';

describe('detectPageLayout', () => {
  test('detects two columns when left/right clusters have a clear gap', () => {
    const pageWidth = 600;
    const pageHeight = 400;
    const items: PositionedTextItem[] = [];

    for (let index = 0; index < 30; index += 1) {
      items.push(makeItem({ x: 60, y: 350 - index * 10, text: `left-${index}` }));
      items.push(makeItem({ x: 360, y: 350 - index * 10, text: `right-${index}` }));
    }

    const detected = detectPageLayout(items, pageWidth, pageHeight);

    assert.equal(detected.layout, 'two-column');
    assert.ok(detected.splitX > 100 && detected.splitX < 500);
  });

  test('keeps single column for narrow/portrait pages', () => {
    const items = Array.from({ length: 25 }, (_, index) => makeItem({
      x: 50,
      y: 700 - index * 20,
      text: `line-${index}`,
      pageWidth: 400,
      pageHeight: 700,
    }));

    const detected = detectPageLayout(items, 400, 700);

    assert.equal(detected.layout, 'single-column');
  });
});

describe('pageToLines', () => {
  test('reads left column fully before right column', () => {
    const page: PdfPageText = {
      page: 1,
      width: 600,
      height: 400,
      layout: 'two-column',
      splitX: 300,
      items: [
        makeItem({ x: 40, y: 300, text: 'L1' }),
        makeItem({ x: 340, y: 300, text: 'R1' }),
        makeItem({ x: 40, y: 250, text: 'L2' }),
        makeItem({ x: 340, y: 250, text: 'R2' }),
      ],
    };

    const lines = pageToLines(page).map((line) => line.text);

    assert.deepEqual(lines, ['L1', 'L2', 'R1', 'R2']);
  });
});

describe('pdfLinesToParagraphs', () => {
  test('merges hyphenated breaks across column boundaries', () => {
    const paragraphs = pdfLinesToParagraphs([
      { page: 1, column: 0, x: 40, y: 200, height: 12, text: 'придуман-' },
      { page: 1, column: 1, x: 340, y: 350, height: 12, text: 'ным словом' },
    ]);

    assert.equal(paragraphs.length, 1);
    assert.equal(paragraphs[0].text, 'придуманным словом');
  });
});

function makeItem(partial: Partial<PositionedTextItem> & Pick<PositionedTextItem, 'x' | 'y' | 'text'>): PositionedTextItem {
  return {
    page: partial.page ?? 1,
    pageWidth: partial.pageWidth ?? 600,
    pageHeight: partial.pageHeight ?? 400,
    x: partial.x,
    y: partial.y,
    width: partial.width ?? 40,
    height: partial.height ?? 12,
    text: partial.text,
  };
}
