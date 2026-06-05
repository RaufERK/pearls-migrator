import { readFile } from 'node:fs/promises';

import JSZip from 'jszip';

export type DocxRun = {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number | null;
};

export type DocxParagraph = {
  text: string;
  runs: DocxRun[];
  styleId: string | null;
  isBold: boolean;
  isItalic: boolean;
  maxFontSize: number | null;
  boldTextRatio: number;
};

export type DocxTextPart = {
  path: string;
  paragraphs: DocxParagraph[];
};

export type ExtractedDocxText = {
  headers: DocxTextPart[];
  body: DocxTextPart;
  footers: DocxTextPart[];
};

export async function extractDocxText(filePath: string): Promise<ExtractedDocxText> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const styles = await extractStyles(zip);

  return {
    headers: await extractParts(zip, /^word\/header\d+\.xml$/u, styles),
    body: await extractRequiredPart(zip, 'word/document.xml', styles),
    footers: await extractParts(zip, /^word\/footer\d+\.xml$/u, styles),
  };
}

type TextStyle = {
  isBold: boolean | null;
  isItalic: boolean | null;
  fontSize: number | null;
};

async function extractRequiredPart(zip: JSZip, path: string, styles: Record<string, TextStyle>): Promise<DocxTextPart> {
  const file = zip.file(path);

  if (!file) {
    throw new Error(`DOCX part not found: ${path}`);
  }

  return {
    path,
    paragraphs: extractParagraphs(await file.async('string'), styles),
  };
}

async function extractParts(zip: JSZip, pattern: RegExp, styles: Record<string, TextStyle>): Promise<DocxTextPart[]> {
  const paths = Object.keys(zip.files).filter((path) => pattern.test(path)).sort();

  return Promise.all(
    paths.map(async (path) => ({
      path,
      paragraphs: extractParagraphs(await zip.files[path].async('string'), styles),
    })),
  );
}

async function extractStyles(zip: JSZip): Promise<Record<string, TextStyle>> {
  const stylesFile = zip.file('word/styles.xml');

  if (!stylesFile) {
    return {};
  }

  const stylesXml = await stylesFile.async('string');
  const styles: Record<string, TextStyle> = {};

  for (const match of stylesXml.matchAll(/<w:style\b[\s\S]*?<\/w:style>/gu)) {
    const styleXml = match[0];
    const styleId = styleXml.match(/\bw:styleId="([^"]+)"/u)?.[1] ?? null;

    if (!styleId) {
      continue;
    }

    const runProperties = styleXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/u)?.[0] ?? '';

    styles[styleId] = {
      isBold: readBooleanProperty(runProperties, 'b'),
      isItalic: readBooleanProperty(runProperties, 'i'),
      fontSize: readFontSize(runProperties),
    };
  }

  return styles;
}

function extractParagraphs(xml: string, styles: Record<string, TextStyle>): DocxParagraph[] {
  return [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/gu)]
    .map((match) => extractParagraph(match[0], styles))
    .filter((paragraph) => paragraph.text.length > 0);
}

function extractParagraph(paragraphXml: string, styles: Record<string, TextStyle>): DocxParagraph {
  const styleId = paragraphXml.match(/<w:pStyle\b[^>]*\bw:val="([^"]+)"/u)?.[1] ?? null;
  const paragraphStyle = styleId ? styles[styleId] ?? null : null;
  const runs = extractRuns(paragraphXml, paragraphStyle);
  const text = normalizeText(runs.map((run) => run.text).join(''));
  const textLength = countTextChars(text);
  const boldTextLength = runs
    .filter((run) => run.isBold)
    .reduce((sum, run) => sum + countTextChars(run.text), 0);
  const boldTextRatio = textLength > 0 ? boldTextLength / textLength : 0;
  const maxFontSize = runs.reduce<number | null>((max, run) => {
    if (!run.fontSize) {
      return max;
    }

    return max === null ? run.fontSize : Math.max(max, run.fontSize);
  }, null);

  return {
    text,
    runs,
    styleId,
    isBold: boldTextRatio >= 0.6,
    isItalic: runs.length > 0 && runs.every((run) => run.text.trim().length === 0 || run.isItalic),
    maxFontSize,
    boldTextRatio,
  };
}

function extractRuns(paragraphXml: string, paragraphStyle: TextStyle | null): DocxRun[] {
  const runs: DocxRun[] = [];

  for (const match of paragraphXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/gu)) {
    const runXml = match[0];
    const runProperties = runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/u)?.[0] ?? '';
    const directBold = readBooleanProperty(runProperties, 'b');
    const directItalic = readBooleanProperty(runProperties, 'i');
    const directFontSize = readFontSize(runProperties);
    const text = extractRunText(runXml);

    if (!text) {
      continue;
    }

    runs.push({
      text,
      isBold: directBold ?? paragraphStyle?.isBold ?? false,
      isItalic: directItalic ?? paragraphStyle?.isItalic ?? false,
      fontSize: directFontSize ?? paragraphStyle?.fontSize ?? null,
    });
  }

  return runs;
}

function extractRunText(runXml: string): string {
  const parts: string[] = [];
  const tokenPattern = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gu;

  for (const match of runXml.matchAll(tokenPattern)) {
    if (match[0].startsWith('<w:tab')) {
      parts.push(' ');
    } else if (match[0].startsWith('<w:br')) {
      parts.push('\n');
    } else {
      parts.push(stripXmlTags(decodeXmlEntities(match[1] ?? '')));
    }
  }

  return parts.join('');
}

function readBooleanProperty(xml: string, name: 'b' | 'i'): boolean | null {
  const match = xml.match(new RegExp(`<w:${name}\\b([^>]*)\\/?>(?:<\\/w:${name}>)?`, 'u'));

  if (!match) {
    return null;
  }

  const value = match[1].match(/\bw:val="([^"]+)"/u)?.[1];

  return value ? !/^(?:0|false|off)$/iu.test(value) : true;
}

function readFontSize(xml: string): number | null {
  const value = xml.match(/<w:sz\b[^>]*\bw:val="(\d+)"/u)?.[1];

  return value ? Number(value) / 2 : null;
}

function countTextChars(value: string): number {
  return value.replace(/\s+/gu, '').length;
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .trim();
}

function stripXmlTags(value: string): string {
  return value.replace(/<[^>]+>/gu, '');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&');
}
