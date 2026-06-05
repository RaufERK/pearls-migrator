import type { CatalogFilterLink, PearlCatalogItem } from '../types.js';
import { PageShell, type SeoViewModel } from './PageShell.js';
import { SiteHeader } from './SiteHeader.js';

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
      <SiteHeader />

      <main className="page page--index">
        <section className="index">
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

          <div className="index__intro">
            <div className="index__intro-line" aria-hidden="true" />
            <p>Серверный каталог Word-брошюр с полными текстами, скачиваниями и страницами для печати.</p>
            <div className="index__intro-line" aria-hidden="true" />
          </div>

          <div className="index__tables">
            {documentGroups.length > 0 ? (
              documentGroups.map((yearGroup) => (
                <section className="year-section" aria-labelledby={`year-${yearGroup.year}`} key={yearGroup.year}>
                  <header className="year-section__header">
                    <div className="year-section__line" aria-hidden="true" />
                    <h1 id={`year-${yearGroup.year}`}>{yearGroup.year}</h1>
                    <div className="year-section__line year-section__line--wide" aria-hidden="true" />
                  </header>
                  <div className="pearls-table-wrap">
                    <table className="pearls-table">
                      <thead>
                        <tr>
                          <th scope="col">Месяц</th>
                          <th scope="col">Материалы</th>
                          <th scope="col">Дата создания</th>
                          <th scope="col">Скачать</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearGroup.months.flatMap((monthGroup) => (
                          monthGroup.documents.flatMap((document) => toPearlRows(document))
                        ))}
                      </tbody>
                    </table>
                  </div>
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

function toPearlRows(item: PearlCatalogItem) {
  const documents = item.documents.length > 0 ? item.documents : [];

  if (documents.length === 0) {
    return [
      <tr className="pearls-table__row pearls-table__row--first" key={item.path}>
        <td className="pearls-table__month">
          <a href={item.path}>{item.siteMonthLabel}</a>
        </td>
        <td>
          <a className="material-link" href={item.path}>{item.description}</a>
        </td>
        <td className="pearls-table__date">-</td>
        <td className="pearls-table__downloads">
          <DownloadLinks item={item} />
        </td>
      </tr>,
    ];
  }

  return documents.map((document, index) => (
    <tr
      className={`pearls-table__row${index === 0 ? ' pearls-table__row--first' : ''}`}
      key={`${item.path}-${index}`}
    >
      {index === 0 ? (
        <td className="pearls-table__month" rowSpan={documents.length}>
          <a href={item.path}>{item.siteMonthLabel.replace(` ${item.siteYear}`, '')}</a>
        </td>
      ) : null}
      <td className="pearls-table__material">
        <MaterialLink document={document} itemPath={item.path} />
      </td>
      <td className="pearls-table__date">{document.creationLabel ?? '-'}</td>
      {index === 0 ? (
        <td className="pearls-table__downloads" rowSpan={documents.length}>
          <DownloadLinks item={item} />
        </td>
      ) : null}
    </tr>
  ));
}

function MaterialLink({ document, itemPath }: { document: PearlCatalogItem['documents'][number]; itemPath: string }) {
  return (
    <a className="material-link" href={itemPath}>
      {document.documentTypeLabel ? <span className="material-link__type">{document.documentTypeLabel}</span> : null}
      {document.author ? <span className="material-link__author">{document.author}</span> : null}
      {document.title ? (
        <span className="material-link__title">«{document.title}»</span>
      ) : (
        <span className="material-link__title">{document.rawHeader}</span>
      )}
      {document.partTitle ? <span className="material-link__part">{document.partTitle}</span> : null}
    </a>
  );
}

function DownloadLinks({ item }: { item: PearlCatalogItem }) {
  return (
    <div className="table-actions">
      <a className="table-action table-action--violet" href={item.downloads.txt}>TXT</a>
      <a className="table-action table-action--blue" href={item.downloads.docx}>DOCX</a>
      <a className="table-action table-action--pink" href={item.downloads.epub}>EPUB</a>
      <a
        className="table-action table-action--cyan"
        href={`${item.path}?print=1`}
        target="_blank"
        rel="noopener"
        aria-label={`Печатать ${item.siteMonthLabel}`}
      >
        ⎙
      </a>
    </div>
  );
}
