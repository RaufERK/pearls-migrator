import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Paragraph } from '../types.js';
import {
  buildSlug,
  cleanAuthorName,
  extractAuthor,
  extractCreation,
  extractDocumentTitle,
  extractDocumentType,
  extractPearlPublication,
  extractSitePublication,
  extractSourcePublicationParts,
  parseRussianDate,
} from './extractWordPearl.js';

/**
 * Regression tests for the pure string-processing helpers behind the Word
 * parser. Fixtures below are copied verbatim from already-reviewed
 * data/parsed/*.json output, so a passing suite means the parser still
 * agrees with editor-reviewed history for these real brochures.
 */

function p(text: string): Paragraph {
  return { text };
}

describe('extractDocumentType', () => {
  it('picks sermon over lecture when the footer attribution says "Проповедь"', () => {
    const metadataText = [
      'Лекция Марка Л. Профета',
      'Далекий Бог',
      'Проповедь Марка Л. Профета «Далекий Бог» была прочитана 1 февраля 1970 года в Колорадо-Спрингс, Колорадо.',
    ].join('\n');

    assert.equal(extractDocumentType(metadataText), 'sermon');
  });

  it('detects a plain lecture', () => {
    const metadataText = [
      'Лекция Элизабет Клэр Профет',
      'О трех царях',
      'Лекция о трех царях была прочитана Элизабет Клэр Профет 3 января 1998 года в отеле Adam\'s Mark, Сан-Антонио, Техас.',
    ].join('\n');

    assert.equal(extractDocumentType(metadataText), 'lecture');
  });

  it('detects dictation, lecture course and teaching', () => {
    assert.equal(extractDocumentType('Диктовка Эль Мории'), 'dictation');
    assert.equal(extractDocumentType('Курс лекций по алхимии'), 'lectureCourse');
    assert.equal(extractDocumentType('Учения о семи лучах'), 'teaching');
  });

  it('falls back to material when nothing matches', () => {
    assert.equal(extractDocumentType('Просто произвольный текст без маркеров типа'), 'material');
  });
});

describe('parseRussianDate', () => {
  it('parses real footer dates into ISO form', () => {
    assert.deepEqual(parseRussianDate('была прочитана 1 февраля 1970 года в Колорадо-Спрингс'), {
      date: '1970-02-01',
      year: 1970,
    });
    assert.deepEqual(parseRussianDate('прочитана Элизабет Клэр Профет 3 января 1998 года в отеле'), {
      date: '1998-01-03',
      year: 1998,
    });
  });

  it('rejects impossible calendar dates', () => {
    assert.equal(parseRussianDate('31 февраля 1970 года'), null);
  });

  it('returns null when there is no date in the text', () => {
    assert.equal(parseRussianDate('Здесь нет никакой даты вообще'), null);
  });
});

describe('extractCreation', () => {
  it('extracts date/year/raw from a real sermon footer', () => {
    const footer = 'Проповедь Марка Л. Профета «Далекий Бог» была прочитана 1 февраля 1970 года в Колорадо-Спрингс, Колорадо.';

    assert.deepEqual(extractCreation(footer, '../SOURCE_PERALS/2020/Q1/word/2020Q1-1.doc'), {
      date: '1970-02-01',
      year: 1970,
      raw: footer,
    });
  });

  it('falls back to the source path year when the footer has no parseable date', () => {
    const result = extractCreation('', '../SOURCE_PERALS/2020/Q1/word/2020Q1-1.doc');

    assert.equal(result.date, null);
    assert.equal(result.year, 2020);
    assert.equal(result.raw, null);
  });
});

describe('extractAuthor + cleanAuthorName', () => {
  it('recognizes Mark L. Prophet from a header attribution line', () => {
    const header = ['Лекция Марка Л. Профета', 'Далекий Бог'];
    const author = extractAuthor(header, header.join('\n'), 'irrelevant.docx', null);

    assert.deepEqual(author, {
      name: 'Марк Л. Профет',
      slug: 'mark-l-profet',
      raw: 'Лекция Марка Л. Профета',
    });
  });

  it('recognizes Elizabeth Clare Prophet from a header attribution line', () => {
    const header = ['Лекция Элизабет Клэр Профет', 'О трех царях'];
    const author = extractAuthor(header, header.join('\n'), 'irrelevant.docx', null);

    assert.deepEqual(author, {
      name: 'Элизабет Клэр Профет',
      slug: 'elizabet-kler-profet',
      raw: 'Лекция Элизабет Клэр Профет',
    });
  });

  it('normalizes short forms like "Э. К. Профет"', () => {
    assert.equal(cleanAuthorName('Лекция Э. К. Профет'), 'Элизабет Клэр Профет');
  });
});

describe('extractDocumentTitle', () => {
  it('picks the last non-noise header line as the title', () => {
    const header = [p('Жемчужины МудростиЯнварь 2020'), p('Январь 2020'), p('Лекция Марка Л. Профета'), p('Далекий Бог')];
    const body = [p('Сегодня утром я хочу сказать совсем немного.')];

    assert.equal(extractDocumentTitle(header, body, []), 'Далекий Бог');
  });

  it('keeps a short standalone header title next to a lecture attribution line', () => {
    const header = [p('Лекция Элизабет Клэр Профет'), p('О трех царях')];
    const body = [p('Сейчас я хочу представить вашему вниманию лекцию о трёх царях.')];

    assert.equal(extractDocumentTitle(header, body, []), 'О трех царях');
  });
});

describe('extractPearlPublication', () => {
  it('parses volume/issue/date out of a real "Том ... №" line', () => {
    const raw = 'Том 21 № 32 – Иисус Христос – 6 августа 1978 г.';

    assert.deepEqual(extractPearlPublication([raw]), {
      volume: 21,
      issue: '32',
      date: '1978-08-06',
      rawDate: '6 августа 1978 г.',
      raw,
    });
  });

  it('returns an empty publication when there is no matching line', () => {
    assert.deepEqual(extractPearlPublication(['Просто текст без публикации']), {
      volume: null,
      issue: null,
      date: null,
      rawDate: null,
      raw: null,
    });
  });
});

describe('source path parsing (year/quarter/month/slug)', () => {
  const sourceWord = '../SOURCE_PERALS/2020/Q1/word/2020Q1-1.doc';

  it('extracts year/quarter/month/rawLabel from a canonical source path', () => {
    assert.deepEqual(extractSourcePublicationParts(sourceWord), {
      year: 2020,
      quarter: 1,
      month: 1,
      rawLabel: 'январь 2020',
    });
  });

  it('builds a full site publication from the same path', () => {
    assert.deepEqual(extractSitePublication(sourceWord, []), {
      label: 'Январь 2020',
      rawLabel: 'январь 2020',
      year: 2020,
      month: 1,
      months: ['2020-01'],
      sortDate: '2020-01-01',
    });
  });

  it('builds the canonical YYYYQn-m slug', () => {
    const sitePublication = extractSitePublication(sourceWord, []);

    assert.equal(buildSlug(sourceWord, sitePublication), '2020Q1-1');
  });
});
