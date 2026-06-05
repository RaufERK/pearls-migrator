import type { ReactNode } from 'react';

export type SeoViewModel = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: 'website' | 'article';
};

type PageShellProps = {
  seo: SeoViewModel;
  bodyClassName?: string;
  children: ReactNode;
  afterBody?: ReactNode;
};

export function PageShell({ seo, bodyClassName, children, afterBody }: PageShellProps) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonicalUrl} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content={seo.ogType ?? 'website'} />
        <meta property="og:url" content={seo.canonicalUrl} />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body className={bodyClassName}>
        {children}
        {afterBody}
      </body>
    </html>
  );
}
