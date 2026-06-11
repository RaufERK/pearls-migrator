type SiteHeaderProps = {
  hiddenFilters?: {
    name: string;
    value: string;
  }[];
  searchQuery?: string | null;
  searchResetHref?: string;
};

export function SiteHeader({ hiddenFilters = [], searchQuery = null, searchResetHref = '/' }: SiteHeaderProps) {
  const hasSearch = Boolean(searchQuery?.trim());

  return (
    <header className="sticky top-0 z-30 border-b-2 border-violet-400/60 bg-linear-to-r from-indigo-950/95 via-purple-900/95 to-pink-950/95 shadow-[0_18px_46px_rgba(0,0,0,0.3)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-6">
        <a
          className="bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-3xl font-bold leading-none text-transparent drop-shadow-lg"
          href="/"
        >
          Жемчужины Мудрости
        </a>
        <form className="relative w-72" action="/" role="search">
          {hiddenFilters.map((filter) => (
            <input key={filter.name} name={filter.name} type="hidden" value={filter.value} />
          ))}
          <input
            className="w-full rounded-lg border-2 border-pink-400/40 bg-indigo-900/60 px-4 py-2 pr-10 text-violet-100 transition-all placeholder:text-pink-300/60 focus:border-pink-400 focus:outline-none focus:shadow-lg focus:shadow-pink-500/20"
            type="search"
            name="q"
            placeholder="Поиск по Владыке, названию..."
            aria-label="Поиск по материалам"
            defaultValue={searchQuery ?? ''}
          />
          {hasSearch ? (
            <a
              aria-label="Очистить поиск"
              className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-pink-300 transition-colors hover:text-pink-100"
              href={searchResetHref}
              title="Очистить поиск"
            >
              x
            </a>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300" aria-hidden="true">
              ⌕
            </span>
          )}
        </form>
      </div>
    </header>
  );
}
