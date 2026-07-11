import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AiMetadata } from './metadataAi.js';
import { applyAiMetadata, needsAiMetadataEnrichment, normalizeExistingDocument } from './metadataNormalization.js';
import type { PearlInnerDocument } from './types.js';

/**
 * Regression tests for the AI metadata merge/normalization logic. Fixtures
 * mirror real parsed documents (see data/parsed/2020/2020Q1-1.json) so a
 * passing suite means the normalization rules still agree with editor-
 * reviewed history.
 */

function emptyAiMetadata(overrides: Partial<AiMetadata> = {}): AiMetadata {
  return {
    documentTitle: null,
    documentType: null,
    author: { name: null, raw: null, confidence: 'low' },
    creation: { date: null, year: null, raw: null, confidence: 'low' },
    pearlPublication: { volume: null, issue: null, date: null, rawDate: null, raw: null, confidence: 'low' },
    notes: null,
    ...overrides,
  };
}

function baseDocument(overrides: Partial<PearlInnerDocument> = {}): PearlInnerDocument {
  return {
    documentTitle: null,
    documentType: 'sermon',
    author: { name: null, slug: null, raw: null },
    creation: { date: null, year: null, raw: null },
    pearlPublication: { volume: null, issue: null, date: null, rawDate: null, raw: null },
    parts: { header: [], body: [], footer: [] },
    ...overrides,
  };
}

describe('normalizeExistingDocument', () => {
  it('normalizes a genitive author name and keeps a clean existing title (Mark L. Prophet sermon)', () => {
    const document = baseDocument({
      documentTitle: 'Далекий Бог',
      documentType: 'sermon',
      author: { name: 'Марка Л. Профета', slug: 'marka-l-profeta', raw: 'Лекция Марка Л. Профета' },
      creation: { date: '1970-02-01', year: 1970, raw: 'Проповедь Марка Л. Профета «Далекий Бог» была прочитана 1 февраля 1970 года.' },
      parts: { header: ['Лекция Марка Л. Профета', 'Далекий Бог'], body: [], footer: [] },
    });

    const result = normalizeExistingDocument(document);

    assert.equal(result.author.name, 'Марк Л. Профет');
    assert.equal(result.author.slug, 'mark-l-profet');
    assert.equal(result.documentTitle, 'Далекий Бог');
  });

  it('keeps the canonical casing for Elizabeth Clare Prophet and preserves the existing title', () => {
    const document = baseDocument({
      documentTitle: 'О трех царях',
      documentType: 'lecture',
      author: { name: 'Элизабет Клэр Профет', slug: 'elizabet-kler-profet', raw: 'Лекция Элизабет Клэр Профет' },
      parts: { header: ['Лекция Элизабет Клэр Профет', 'О трех царях'], body: [], footer: [] },
    });

    const result = normalizeExistingDocument(document);

    assert.equal(result.author.name, 'Элизабет Клэр Профет');
    assert.equal(result.documentTitle, 'О трех царях');
  });
});

describe('needsAiMetadataEnrichment', () => {
  it('skips AI when a usable title is already present', () => {
    const document = baseDocument({
      documentTitle: 'Далекий Бог',
      parts: { header: ['Лекция Марка Л. Профета', 'Далекий Бог'], body: [], footer: [] },
    });

    assert.equal(needsAiMetadataEnrichment(document), false);
  });

  it('requests AI when title is only a bare part marker', () => {
    const document = baseDocument({
      documentTitle: '(часть 1)',
      parts: { header: ['Жемчужины Мудрости'], body: [], footer: [] },
    });

    assert.equal(needsAiMetadataEnrichment(document), true);
  });

  it('requests AI when title is missing and header has no usable title', () => {
    const document = baseDocument({
      documentTitle: null,
      parts: { header: ['Жемчужины Мудрости'], body: [], footer: [] },
    });

    assert.equal(needsAiMetadataEnrichment(document), true);
  });

  it('skips AI when header already yields a structured title', () => {
    const document = baseDocument({
      documentTitle: null,
      parts: { header: ['Проповедь Э. К. Профет о самоосуждении'], body: [], footer: [] },
    });

    assert.equal(needsAiMetadataEnrichment(document), false);
  });

  it('rebuilds lecture + part title from header instead of keeping a bare part marker', () => {
    const document = baseDocument({
      documentTitle: '(часть 1)',
      documentType: 'lecture',
      author: { name: 'Элизабет Клэр Профет', slug: 'elizabet-kler-profet', raw: 'Элизабет Клэр Профет' },
      parts: {
        header: ['Элизабет Клэр Профет', 'Лекция «Приливы»', '(часть 1)'],
        body: [],
        footer: [],
      },
    });

    assert.equal(normalizeExistingDocument(document).documentTitle, 'Лекция «Приливы» (Часть I)');
    assert.equal(needsAiMetadataEnrichment(document), false);
  });
});

describe('applyAiMetadata', () => {
  it('accepts an AI-provided title when there is no current or header title', () => {
    const document = baseDocument({ documentTitle: null, parts: { header: [], body: [], footer: [] } });
    const metadata = emptyAiMetadata({ documentTitle: 'Настоящее имя лекции' });

    const result = applyAiMetadata(document, metadata);

    assert.equal(result.documentTitle, 'Настоящее имя лекции');
  });

  it('normalizes a short AI author form like "Э. К. Профет"', () => {
    const document = baseDocument();
    const metadata = emptyAiMetadata({ author: { name: 'Э. К. Профет', raw: 'Э. К. Профет', confidence: 'high' } });

    const result = applyAiMetadata(document, metadata);

    assert.equal(result.author.name, 'Элизабет Клэр Профет');
  });

  it('rejects an AI pearlPublication claim that is not backed by any evidence text', () => {
    const document = baseDocument();
    const metadata = emptyAiMetadata({
      pearlPublication: {
        volume: 5,
        issue: '10',
        date: '1980-01-01',
        rawDate: '1 января 1980 г.',
        raw: 'Том 5 № 10 – Кто-то – 1 января 1980 г.',
        confidence: 'high',
      },
    });
    const evidence = { header: ['Несвязанный заголовок'], footer: ['Несвязанный футер'], bodyPreview: ['Несвязанный текст'] };

    const result = applyAiMetadata(document, metadata, evidence);

    assert.deepEqual(result.pearlPublication, document.pearlPublication);
  });

  it('accepts an AI pearlPublication claim when the raw line is present in the evidence', () => {
    const raw = 'Том 5 № 10 – Кто-то – 1 января 1980 г.';
    const document = baseDocument();
    const metadata = emptyAiMetadata({
      pearlPublication: { volume: 5, issue: '10', date: '1980-01-01', rawDate: '1 января 1980 г.', raw, confidence: 'high' },
    });
    const evidence = { header: [raw], footer: [], bodyPreview: [] };

    const result = applyAiMetadata(document, metadata, evidence);

    assert.equal(result.pearlPublication.volume, 5);
    assert.equal(result.pearlPublication.raw, raw);
  });
});
