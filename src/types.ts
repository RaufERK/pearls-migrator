export type PdfLayout = 'single-column' | 'two-column';

export type PdfProcessing = {
  columns: 1 | 2 | null;
  showOriginal: boolean;
  expectedDocuments: number | null;
  sourceOverride: string | null;
  notes: string | null;
};

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

export type DocumentType = 'dictation' | 'lecture' | 'lectureCourse' | 'teaching' | 'sermon' | 'prayer' | 'material';

export type AuthorMetadata = {
  name: string | null;
  slug: string | null;
  raw: string | null;
};

export type SitePublication = {
  label: string | null;
  rawLabel: string | null;
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

export type PearlInnerDocument = {
  documentTitle: string | null;
  documentType: DocumentType;
  author: AuthorMetadata;
  creation: CreationMetadata;
  pearlPublication: PearlPublication;
  parts: DocumentParts;
};

export type PearlDocument = {
  slug: string;
  title: string;
  sitePublication: SitePublication;
  documentsCount: number;
  documents: PearlInnerDocument[];
  sourcePdf: string;
  sourceWord?: string;
  preparedDocx?: string;
  jsonPath: string;
  parsedAt: string;
  meta: {
    pages: number;
    layout: PdfLayout;
  };
  processing?: PdfProcessing;
};

export type CatalogFilters = {
  author?: string;
  siteYear?: number;
  creationYear?: number;
  documentType?: DocumentType;
};

export type CatalogFilterLink = {
  label: string;
  href: string;
};

export type ContainedDocument = {
  author: string | null;
  authorLink?: CatalogFilterLink | null;
  title: string | null;
  partTitle?: string | null;
  creationLabel?: string | null;
  creationDateLabel?: string | null;
  creationYear?: number | null;
  creationYearLink?: CatalogFilterLink | null;
  documentType?: DocumentType;
  documentTypeLabel?: string;
  documentTypeLink?: CatalogFilterLink | null;
  rawHeader: string;
};

export type PearlCatalogItem = {
  slug: string;
  year: string;
  siteYear: number;
  siteMonth: number | null;
  siteMonthLabel: string;
  path: string;
  jsonPath: string;
  sourcePath: string;
  sourceLabel: string;
  sourceType: 'pdf' | 'word';
  title: string;
  documentsCount: number;
  documents: ContainedDocument[];
  singleDocument: ContainedDocument | null;
  description: string;
  body: Paragraph[];
  author: CatalogFilterLink | null;
  sitePublication: CatalogFilterLink;
  creation: CatalogFilterLink | null;
  documentType: CatalogFilterLink;
  pages: number;
  paragraphs: number;
  layout: PdfLayout;
  showOriginal: boolean;
  originalSource: {
    href: string;
    label: string;
  };
  downloads: {
    original: string;
    txt: string;
    docx: string;
    epub: string;
  };
};
