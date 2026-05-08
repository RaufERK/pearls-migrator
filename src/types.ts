export type PdfLayout = 'single-column' | 'two-column';

export type ExtractedLine = {
  page: number;
  column: number;
  x: number;
  y: number;
  height: number;
  text: string;
};

export type Paragraph = {
  text: string;
};

export type PearlDocument = {
  sourcePath: string;
  title: string;
  subtitle: string[];
  paragraphs: Paragraph[];
  meta: {
    pages: number;
    layout: PdfLayout;
  };
};

export type PearlCatalogItem = {
  slug: string;
  year: string;
  path: string;
  jsonPath: string;
  sourcePath: string;
  sourceLabel: string;
  title: string;
  subtitle: string;
  description: string;
  pages: number;
  paragraphs: number;
  layout: PdfLayout;
  downloads: {
    txt: string;
    docx: string;
    epub: string;
  };
};
