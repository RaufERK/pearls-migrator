'use client';

import type { ChangeEvent } from 'react';

import type { CatalogFilterLink } from '../lib/pearls';

type SiteYearSelectProps = {
  hiddenFilters: {
    name: string;
    value: string;
  }[];
  selectedSiteYear: number | null;
  yearLinks: CatalogFilterLink[];
};

export function SiteYearSelect({ hiddenFilters, selectedSiteYear, yearLinks }: SiteYearSelectProps) {
  const mobileLabel = selectedSiteYear ? String(selectedSiteYear) : 'Все годы';

  return (
    <>
      <details className="relative shrink-0 sm:hidden">
        <summary className="flex h-9 w-36 cursor-pointer list-none items-center justify-between rounded-lg border-2 border-violet-500/40 bg-indigo-900/80 px-3 py-1.5 text-sm text-violet-100 marker:hidden">
          <span>{mobileLabel}</span>
          <span aria-hidden="true" className="text-violet-300">⌄</span>
        </summary>
        <nav className="absolute left-0 top-10 z-30 grid w-36 overflow-hidden rounded-lg border border-violet-400/40 bg-indigo-950 text-sm text-violet-100 shadow-xl shadow-black/40">
          <a className={toMobileYearClass(!selectedSiteYear)} href={toHref(hiddenFilters)}>
            Все годы
          </a>
          {yearLinks.map((link) => (
            <a className={toMobileYearClass(selectedSiteYear === Number(link.value))} href={link.href} key={link.value}>
              {link.label}
            </a>
          ))}
        </nav>
      </details>

      <form action="/" className="hidden shrink-0 sm:block">
        {hiddenFilters.map((filter) => (
          <input key={filter.name} name={filter.name} type="hidden" value={filter.value} />
        ))}
        <select
          aria-label="Фильтр по году публикации"
          className="h-9 w-36 shrink-0 cursor-pointer rounded-lg border-2 border-violet-500/40 bg-indigo-900/80 px-3 py-1.5 text-sm text-violet-100 transition-colors focus:border-violet-400 focus:outline-none"
          defaultValue={selectedSiteYear ?? ''}
          name="siteYear"
          onChange={submitYearForm}
        >
          <option className="bg-indigo-950 text-violet-100" value="">Все годы</option>
          {yearLinks.map((link) => (
            <option className="bg-indigo-950 text-violet-100" key={link.value} value={link.value}>
              {link.label}
            </option>
          ))}
        </select>
      </form>
    </>
  );
}

function submitYearForm(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function toHref(filters: { name: string; value: string }[]) {
  const params = new URLSearchParams();

  for (const filter of filters) {
    params.set(filter.name, filter.value);
  }

  const query = params.toString();

  return query ? `/?${query}` : '/';
}

function toMobileYearClass(active: boolean) {
  return `px-3 py-2 transition-colors ${active ? 'bg-violet-600/50 text-white' : 'hover:bg-indigo-900/80'}`;
}
