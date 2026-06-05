import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { PearlCatalogItem, PearlDocument } from './types.js';
import { IndexPage, type IndexPageProps } from './views/IndexPage.js';
import { PearlPage, type PearlPageInnerDocumentViewModel } from './views/PearlPage.js';

export function renderIndexPage(props: IndexPageProps): string {
  return renderStaticPage(<IndexPage {...props} />);
}

export function renderPearlPage(
  document: PearlDocument,
  item: PearlCatalogItem,
  siteUrl: string,
  autoPrint = false,
): string {
  return renderStaticPage(
    <PearlPage
      document={document}
      displayDocuments={toDisplayDocuments(document)}
      item={item}
      original={{
        href: item.originalSource.href,
        label: item.originalSource.label,
        showInsteadOfText: document.processing?.showOriginal ?? false,
        notes: document.processing?.notes,
      }}
      seo={{
        title: `${document.title} — ${item.siteMonthLabel}`,
        description: item.description,
        canonicalUrl: `${siteUrl}${item.path}`,
      }}
      print={{
        auto: autoPrint,
      }}
    />,
  );
}

function renderStaticPage(page: ReactElement): string {
  return `<!doctype html>${renderToStaticMarkup(page)}`;
}

function toDisplayDocuments(document: PearlDocument): PearlPageInnerDocumentViewModel[] {
  return document.documents.map((innerDocument) => ({
    ...innerDocument,
    displayHeader: innerDocument.parts.header.filter((line) => line !== document.sitePublication.label),
  }));
}
