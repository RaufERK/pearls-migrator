export function SiteHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a className="app-header__brand" href="/">Жемчужины Мудрости</a>
        <form className="app-search" action="/" role="search">
          <input type="search" name="q" placeholder="Поиск..." aria-label="Поиск по материалам" disabled />
          <span aria-hidden="true">⌕</span>
        </form>
      </div>
    </header>
  );
}
