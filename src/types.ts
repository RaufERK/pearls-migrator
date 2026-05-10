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

export type DocumentType = 'dictation' | 'lecture' | 'sermon' | 'prayer' | 'material';

export type AuthorMetadata = {
  name: string | null;
  slug: string | null;
  raw: string | null;
};

export type SitePublication = {
  label: string | null;
  year: number | null;
  month: number | null;
  months: string[];
  sortDate: string | null;
};

export type CreationMetadata = {
  date: string | null;
  year: number | null;
  raw: string | null;
};

export type PearlPublication = {
  volume: number | null;
  issue: string | null;
  date: string | null;
  rawDate: string | null;
  raw: string | null;
};

export type DocumentParts = {
  header: string[];
  body: Paragraph[];
  footer: Paragraph[];
};

export type PearlDocument = {
  slug: string;
  year: number;
  month: number | null;
  day: number | null;
  publishedAt: string | null;
  sortDate: string;
  title: string;
  subtitle: string[];
  speaker: string | null;
  documentTitle: string | null;
  documentType: DocumentType;
  author: AuthorMetadata;
  sitePublication: SitePublication;
  creation: CreationMetadata;
  pearlPublication: PearlPublication;
  parts: DocumentParts;
  sourcePdf: string;
  jsonPath: string;
  parsedAt: string;
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
