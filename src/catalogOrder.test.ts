import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groupCatalogBySiteDate, uniqueYearsDescending } from './catalogOrder.js';

describe('uniqueYearsDescending', () => {
  it('puts the newest year first and drops duplicates', () => {
    assert.deepEqual(uniqueYearsDescending([2006, 2026, 2010, 2026]), [2026, 2010, 2006]);
  });
});

describe('groupCatalogBySiteDate', () => {
  it('groups newest years and months first even if input is oldest-first', () => {
    const items = [
      { slug: 'old-jan', siteYear: 2006, siteMonth: 1, siteMonthLabel: 'Январь 2006' },
      { slug: 'old-dec', siteYear: 2006, siteMonth: 12, siteMonthLabel: 'Декабрь 2006' },
      { slug: 'new-jan', siteYear: 2026, siteMonth: 1, siteMonthLabel: 'Январь 2026' },
      { slug: 'new-sep', siteYear: 2026, siteMonth: 9, siteMonthLabel: 'Сентябрь 2026' },
    ];
    const groups = groupCatalogBySiteDate(items);

    assert.deepEqual(groups.map((group) => group.year), ['2026', '2006']);
    assert.deepEqual(groups[0]?.months.map((month) => month.label), ['Сентябрь 2026', 'Январь 2026']);
    assert.deepEqual(groups[1]?.months.map((month) => month.label), ['Декабрь 2006', 'Январь 2006']);
    assert.deepEqual(groups[0]?.months[0]?.documents.map((document) => document.slug), ['new-sep']);
  });
});
