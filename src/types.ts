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
  styleId?: string | null;
  isBold?: boolean;
  isItalic?: boolean;
  maxFontSize?: number | null;
  boldTextRatio?: number;
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
