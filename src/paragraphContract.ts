import { toBody, type Paragraph } from './catalogLabels.js';

export { anchorId, paragraphId, paragraphUrl } from './paragraphAnchor.js';

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
