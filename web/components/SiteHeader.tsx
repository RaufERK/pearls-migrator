export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-violet-400/60 bg-gradient-to-r from-indigo-950/95 via-purple-900/95 to-pink-950/95 shadow-[0_18px_46px_rgba(0,0,0,0.3)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-6">
        <a
          className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-3xl font-bold leading-none text-transparent drop-shadow-lg"
          href="/"
        >
          Жемчужины Мудрости
        </a>
        <form className="relative w-64" action="/" role="search">
          <input
            className="w-full rounded-lg border-2 border-pink-400/40 bg-indigo-900/60 px-4 py-2 pr-10 font-sans text-violet-100 placeholder:text-pink-300/60"
            type="search"
            name="q"
            placeholder="Поиск..."
            aria-label="Поиск по материалам"
            disabled
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300" aria-hidden="true">
            ⌕
          </span>
        </form>
      </div>
    </header>
  );
}
