import type { PearlCatalogItem, PearlInnerDocument } from '../types.js';
import { PageShell, type SeoViewModel } from './PageShell.js';
import { SiteHeader } from './SiteHeader.js';

export type PearlPageInnerDocumentViewModel = PearlInnerDocument & {
  displayHeader: string[];
};

export type PearlPageProps = {
  document: {
    title: string;
    sitePublication: {
      label: string | null;
    };
  };
  displayDocuments: PearlPageInnerDocumentViewModel[];
  item: PearlCatalogItem;
  original: {
    href: string;
    label: string;
    showInsteadOfText: boolean;
    notes?: string | null;
  };
  seo: SeoViewModel;
  print: {
    auto: boolean;
  };
};

export function PearlPage({ document, displayDocuments, item, original, seo, print }: PearlPageProps) {
  return (
    <PageShell
      seo={{ ...seo, ogType: 'article' }}
      bodyClassName="site-body site-body--pearl"
      afterBody={print.auto ? <AutoPrintScript /> : null}
    >
      <div className="stars" aria-hidden="true" />
      <SiteHeader />
      <main className="page page--pearl">
        <nav className="pearl__back" aria-label="Навигация">
          <a href="/">Назад к списку</a>
        </nav>

        <article className="pearl">
          <header className="pearl__header">
            <div className="pearl__kicker">Жемчужины Мудрости</div>
            <h1>{document.title}</h1>
            {document.sitePublication.label ? (
              <p>{document.sitePublication.label}</p>
            ) : null}

            <nav className="download-links download-links--center" aria-label="Скачать материал">
              <span className="download-links__label">Скачать:</span>
              <a href={item.downloads.txt}>TXT</a>
              <a href={item.downloads.docx}>DOCX</a>
              <a href={item.downloads.epub}>EPUB</a>
              <a href={`${item.path}?print=1`} target="_blank" rel="noopener">Печатать</a>
            </nav>
          </header>

          {original.showInsteadOfText ? (
            <section className="pearl__body">
              <div className="original-pdf">
                <p>Этот материал лучше читать в исходном файле: <a href={original.href}>{original.label}</a></p>
                {original.notes ? <p>{original.notes}</p> : null}
                <iframe className="original-pdf__frame" src={original.href} title="Исходный файл" />
              </div>
            </section>
          ) : (
            <section className="pearl__body">
              {displayDocuments.map((innerDocument, index) => (
                <InnerDocument document={innerDocument} key={`${innerDocument.documentTitle ?? 'document'}-${index}`} />
              ))}
            </section>
          )}

          <footer className="pearl__footer">
            <span>Адрес страницы: <a href={seo.canonicalUrl}>{seo.canonicalUrl}</a></span>
          </footer>
        </article>
      </main>
    </PageShell>
  );
}

function InnerDocument({ document }: { document: PearlPageInnerDocumentViewModel }) {
  return (
    <section className="inner-document">
      <header className="inner-document__header">
        {document.displayHeader.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </header>
      <div className="inner-document__body">
        {document.parts.body.map((paragraph, index) => (
          <p key={`${paragraph.text.slice(0, 40)}-${index}`}>{paragraph.text}</p>
        ))}
      </div>
      {document.parts.footer.length > 0 ? (
        <footer className="inner-document__footer">
          {document.parts.footer.map((paragraph, index) => (
            <p key={`${paragraph.text.slice(0, 40)}-${index}`}>{paragraph.text}</p>
          ))}
        </footer>
      ) : null}
    </section>
  );
}

function AutoPrintScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "window.addEventListener('load', () => { window.print(); });",
      }}
    />
  );
}
