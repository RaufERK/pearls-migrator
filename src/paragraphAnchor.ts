export function anchorId(documentPosition: number, paragraphNumber: number): string {
  return `d${documentPosition}-p${paragraphNumber}`;
}

export function paragraphId(slug: string, documentPosition: number, paragraphNumber: number): string {
  return `pearls:${slug}#${anchorId(documentPosition, paragraphNumber)}`;
}

export function paragraphUrl(siteYear: number, slug: string, documentPosition: number, paragraphNumber: number): string {
  return `https://amasters.ru/pearls/${siteYear}/${slug}#${anchorId(documentPosition, paragraphNumber)}`;
}
