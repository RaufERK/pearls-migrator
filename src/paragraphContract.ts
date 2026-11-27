import { toBody, type Paragraph } from './catalogLabels.js';

export type NumberedParagraph = {
  number: number;
  text: string;
};

/** Paragraph numbers are 1-based indexes of `toBody`. There is no second split. */
export function numberedParagraphs(content: string): NumberedParagraph[] {
  return toBody(content).map((paragraph: Paragraph, index) => ({
    number: index + 1,
    text: paragraph.text,
  }));
}

export function anchorId(documentPosition: number, paragraphNumber: number): string {
  return `d${documentPosition}-p${paragraphNumber}`;
}

export function paragraphId(slug: string, documentPosition: number, paragraphNumber: number): string {
  return `pearls:${slug}#${anchorId(documentPosition, paragraphNumber)}`;
}

export function paragraphUrl(siteYear: number, slug: string, documentPosition: number, paragraphNumber: number): string {
  return `https://amasters.ru/pearls/${siteYear}/${slug}#${anchorId(documentPosition, paragraphNumber)}`;
}
