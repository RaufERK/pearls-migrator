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
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-6">
          <a
            className="bg-linear-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-center text-2xl font-bold leading-none text-transparent drop-shadow-lg sm:text-left sm:text-3xl"
            href="/"
          >
            Жемчужины Мудрости
          </a>
        <SearchForm
          className="relative w-3/4 sm:hidden"
          hasSearch={hasSearch}
          hiddenFilters={hiddenFilters}
          placeholder="Поиск..."
          searchQuery={searchQuery}
          searchResetHref={searchResetHref}
        />
        <SearchForm
          className="relative hidden w-80 sm:block"
          hasSearch={hasSearch}
          hiddenFilters={hiddenFilters}
          placeholder="Поиск по Владыке, названию..."
          searchQuery={searchQuery}
          searchResetHref={searchResetHref}
        />
        </div>
      </div>
    </header>
  );
}

function SearchForm({
  className,
  hasSearch,
  hiddenFilters,
  placeholder,
  searchQuery,
  searchResetHref,
}: SiteHeaderProps & {
  className: string;
  hasSearch: boolean;
  placeholder: string;
}) {
  return (
    <form className={className} action="/" role="search">
      {hiddenFilters?.map((filter) => (
        <input key={filter.name} name={filter.name} type="hidden" value={filter.value} />
      ))}
      <input
        className="w-full rounded-lg border-2 border-pink-400/40 bg-indigo-900/60 px-4 py-1.5 pr-10 text-sm text-violet-100 transition-all placeholder:text-pink-300/60 focus:border-pink-400 focus:outline-none focus:shadow-lg focus:shadow-pink-500/20 sm:py-2 sm:text-base"
        type="search"
        name="q"
        placeholder={placeholder}
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
  );
}
