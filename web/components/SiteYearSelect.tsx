'use client';

import type { ChangeEvent } from 'react';

import type { CatalogYearOption } from '../lib/pearls';

type SiteYearSelectProps = {
  onYearChange: (year: number | null) => void;
  selectedSiteYear: number | null;
  yearLinks: CatalogYearOption[];
};

export function SiteYearSelect({ onYearChange, selectedSiteYear, yearLinks }: SiteYearSelectProps) {
  const mobileLabel = selectedSiteYear ? String(selectedSiteYear) : 'Все годы';

  return (
    <>
      <details className="relative shrink-0 sm:hidden" key={selectedSiteYear ?? 'all'}>
        <summary className="flex h-9 w-36 cursor-pointer list-none items-center justify-between rounded-lg border-2 border-violet-500/40 bg-indigo-900/80 px-3 py-1.5 text-sm text-violet-100 marker:hidden">
          <span>{mobileLabel}</span>
          <span aria-hidden="true" className="text-violet-300">⌄</span>
        </summary>
        <nav className="absolute left-0 top-10 z-30 grid w-36 overflow-hidden rounded-lg border border-violet-400/40 bg-indigo-950 text-sm text-violet-100 shadow-xl shadow-black/40">
          <button className={toMobileYearClass(!selectedSiteYear)} onClick={() => onYearChange(null)} type="button">
            Все годы
          </button>
          {yearLinks.map((link) => (
            <button
              className={toMobileYearClass(selectedSiteYear === Number(link.value))}
              key={link.value}
              onClick={() => onYearChange(Number(link.value))}
              type="button"
            >
              {link.label}
            </button>
          ))}
        </nav>
      </details>

      <select
        aria-label="Фильтр по году публикации"
        className="hidden h-9 w-36 shrink-0 cursor-pointer rounded-lg border-2 border-violet-500/40 bg-indigo-900/80 px-3 py-1.5 text-sm text-violet-100 transition-colors focus:border-violet-400 focus:outline-none sm:block"
        onChange={(event) => submitYearChange(event, onYearChange)}
        value={selectedSiteYear ?? ''}
      >
        <option className="bg-indigo-950 text-violet-100" value="">Все годы</option>
        {yearLinks.map((link) => (
          <option className="bg-indigo-950 text-violet-100" key={link.value} value={link.value}>
            {link.label}
          </option>
        ))}
      </select>
    </>
  );
}

function submitYearChange(event: ChangeEvent<HTMLSelectElement>, onYearChange: (year: number | null) => void) {
  const value = event.currentTarget.value;

  onYearChange(value ? Number(value) : null);
}

function toMobileYearClass(active: boolean) {
  return `px-3 py-2 text-left transition-colors ${active ? 'bg-violet-600/50 text-white' : 'hover:bg-indigo-900/80'}`;
}
