import type { CatalogFilterLink, PearlCatalogItem } from '../types.js';
import { PageShell, type SeoViewModel } from './PageShell.js';

export type CatalogMonthGroupViewModel = {
  label: string;
  documents: PearlCatalogItem[];
};

export type CatalogYearGroupViewModel = {
  year: string;
  months: CatalogMonthGroupViewModel[];
};

export type IndexPageProps = {
  documentGroups: CatalogYearGroupViewModel[];
  filters: {
    active: CatalogFilterLink[];
    hasActive: boolean;
  };
  yearLinks: CatalogFilterLink[];
  seo: SeoViewModel;
};

export function IndexPage({ documentGroups, filters, yearLinks, seo }: IndexPageProps) {
  return (
    <PageShell seo={seo} bodyClassName="site-body site-body--index">
      <div className="stars" aria-hidden="true" />
      <main className="page page--index">
        <section className="index">
          <header className="site-hero">
            <p className="site-hero__eyebrow">Библиотека текстов для чтения онлайн</p>
            <h1>Жемчужины Мудрости</h1>
            <p className="site-hero__lead">
              Серверный каталог Word-брошюр с полными текстами, скачиваниями и страницами для печати.
            </p>
          </header>

          <nav className="year-nav" aria-label="Фильтр по году публикации">
            <a className="year-nav__link" href="/">Все годы</a>
            {yearLinks.map((link) => (
              <a className="year-nav__link" href={link.href} key={link.href}>{link.label}</a>
            ))}
          </nav>

          {filters.hasActive ? (
            <nav className="active-filters" aria-label="Активные фильтры">
              <span className="active-filters__label">Фильтр:</span>
              {filters.active.map((filter) => (
                <a className="filter-chip filter-chip--active" href={filter.href} key={filter.href}>
                  {filter.label} x
                </a>
              ))}
            </nav>
          ) : null}

          <div className="index__list">
            {documentGroups.length > 0 ? (
              documentGroups.map((yearGroup) => (
                <section className="year-group" aria-labelledby={`year-${yearGroup.year}`} key={yearGroup.year}>
                  <h2 id={`year-${yearGroup.year}`}>{yearGroup.year}</h2>
                  {yearGroup.months.map((monthGroup) => (
                    <section className="month-group" aria-label={monthGroup.label} key={`${yearGroup.year}-${monthGroup.label}`}>
                      <div className="month-group__list">
                        {monthGroup.documents.map((document) => (
                          <CatalogCard document={document} key={document.path} />
                        ))}
                      </div>
                    </section>
                  ))}
                </section>
              ))
            ) : (
              <p className="index__empty">По выбранному году документы не найдены.</p>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function CatalogCard({ document }: { document: PearlCatalogItem }) {
  const visibleDocuments = document.documents.length > 0 ? document.documents : [];

  return (
    <article className="index-card">
      <a className="index-card__main" href={document.path}>
        <span className="index-card__title">{document.siteMonthLabel}</span>
        <span className="index-card__subtitle">
          {document.documentsCount > 1 ? `${document.documentsCount} материала` : '1 материал'}
        </span>
      </a>

      {visibleDocuments.length > 0 ? (
        <section
          className={`contained-documents${visibleDocuments.length === 1 ? ' contained-documents--single' : ''}`}
          aria-label={visibleDocuments.length === 1 ? 'Материал внутри выпуска' : 'Материалы внутри выпуска'}
        >
          {visibleDocuments.length === 1 && visibleDocuments[0] ? (
            <ContainedDocumentItem document={visibleDocuments[0]} />
          ) : (
            <ol className="contained-documents__list">
              {visibleDocuments.map((containedDocument, index) => (
                <li key={`${containedDocument.rawHeader}-${index}`}>
                  <ContainedDocumentItem document={containedDocument} />
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <nav className="download-links" aria-label={`Действия для ${document.siteMonthLabel}`}>
        <span className="download-links__label">Действия:</span>
        <a href={document.path}>Читать</a>
        <a href={document.downloads.txt}>TXT</a>
        <a href={document.downloads.docx}>DOCX</a>
        <a href={document.downloads.epub}>EPUB</a>
        <a href={`${document.path}?print=1`} target="_blank" rel="noopener">Печатать</a>
      </nav>
    </article>
  );
}

function ContainedDocumentItem({ document }: { document: PearlCatalogItem['documents'][number] }) {
  return (
    <div className="contained-documents__item">
      {document.documentTypeLabel ? (
        <span className="contained-documents__type">{document.documentTypeLabel}</span>
      ) : null}
      {document.author ? (
        <span className="contained-documents__author">{document.author}</span>
      ) : null}
      {document.title ? (
        <span className="contained-documents__title">«{document.title}»</span>
      ) : (
        <span className="contained-documents__title">{document.rawHeader}</span>
      )}
      {document.creationLabel ? (
        <span className="contained-documents__date">({document.creationLabel})</span>
      ) : null}
      {document.partTitle ? (
        <span className="contained-documents__part">{document.partTitle}</span>
      ) : null}
    </div>
  );
}
