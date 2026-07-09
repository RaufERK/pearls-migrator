import { access, copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

import JSZip from 'jszip';

import { readPearlDocument } from './catalog.js';
import type { DownloadCatalogItem } from './downloadCatalog.js';
import {
  getSourceRootDir,
  resolveMappedSourcePath,
  resolveStoredPath,
  sourceMailingPdfDirName,
  sourcePrintPdfDirName,
  sourceWordDirName,
} from './sourceArchive.js';
import type { Paragraph, PearlDocument, PearlInnerDocument } from './types.js';

export type DownloadFormat = 'pdf' | 'txt' | 'docx' | 'epub';
type GeneratedDownloadFormat = Exclude<DownloadFormat, 'pdf'>;

export const downloadFormats = ['pdf', 'txt', 'docx', 'epub'] as const;

export function getDownloadPath(rootDir: string, item: DownloadCatalogItem, format: DownloadFormat): string {
  return resolve(rootDir, `web/public/downloads/${item.year}/${item.slug}.${format}`);
}

export async function generateDownloads(rootDir: string, items: DownloadCatalogItem[]): Promise<void> {
  const tasks = items.flatMap((item) => downloadFormats.map((format) => ({ item, format })));
  const results = await Promise.allSettled(tasks.map(({ item, format }) => generateDownload(rootDir, item, format)));
  const failures = results.flatMap((result, index) => (result.status === 'rejected' ? [{ task: tasks[index], reason: result.reason }] : []));

  for (const failure of failures) {
    console.error(`Failed to generate ${failure.task.format} for ${failure.task.item.slug}:`, failure.reason);
  }

  if (failures.length > 0) {
    throw new Error(`Failed to generate ${failures.length} of ${tasks.length} download(s); see errors above`);
  }
}

export async function generateDownload(
  rootDir: string,
  item: DownloadCatalogItem,
  format: DownloadFormat,
): Promise<void> {
  const outputPath = getDownloadPath(rootDir, item, format);

  if (format === 'pdf') {
    const sourcePdfPath = await resolveSourcePdfPath(item);

    await mkdir(dirname(outputPath), { recursive: true });
    await copyFile(sourcePdfPath, outputPath);

    return;
  }

  const document = await readPearlDocument(item.jsonPath);
  const content = await renderDownload(toDownloadDocument(document), format);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}

async function resolveSourcePdfPath(item: DownloadCatalogItem): Promise<string> {
  const sourcePath = await resolveExistingSourcePath(item.sourcePath);
  const mailingPdfPath = await findMailingPdfPath(sourcePath, item.slug);

  if (mailingPdfPath) {
    return mailingPdfPath;
  }

  const printPdfPath = await findPrintPdfPath(sourcePath, item.slug);

  if (printPdfPath) {
    return printPdfPath;
  }

  throw new Error(`Source PDF not found for ${item.slug}`);
}

async function resolveExistingSourcePath(sourcePath: string): Promise<string> {
  const resolvedSourcePath = resolveStoredPath(process.cwd(), sourcePath);

  if (await pathExists(resolvedSourcePath)) {
    return resolvedSourcePath;
  }

  const withoutLegacySegment = resolvedSourcePath.replace('/pearls-word/', '/');

  if (withoutLegacySegment !== resolvedSourcePath && await pathExists(withoutLegacySegment)) {
    return withoutLegacySegment;
  }

  const mappedSourcePath = resolveMappedSourcePath(process.cwd(), getSourceRootDir(process.cwd()), sourcePath);

  if (mappedSourcePath && await pathExists(mappedSourcePath)) {
    return mappedSourcePath;
  }

  return resolvedSourcePath;
}

async function findMailingPdfPath(sourceWordPath: string, slug: string): Promise<string | null> {
  const quarterDir = getSourceQuarterDir(sourceWordPath);
  const sourceName = basename(sourceWordPath, extname(sourceWordPath));
  const entries = await readdir(quarterDir, { withFileTypes: true });
  const mailingDirs = [
    join(quarterDir, sourceMailingPdfDirName),
    ...entries
      .filter((entry) => entry.isDirectory() && entry.name.normalize('NFC').toLowerCase().startsWith('рассылка'))
      .map((entry) => join(quarterDir, entry.name)),
  ];

  for (const mailingDir of mailingDirs) {
    const exactPath = join(mailingDir, `${sourceName}.pdf`);

    if (await pathExists(exactPath)) {
      return exactPath;
    }
  }

  const sourceIssuePrefix = extractCanonicalSourceIssuePrefix(sourceName, slug) ?? extractSourceIssuePrefix(sourceName) ?? issuePrefixFromSlug(slug);

  if (!sourceIssuePrefix) {
    return null;
  }

  for (const mailingDir of mailingDirs) {
    if (!(await pathExists(mailingDir))) {
      continue;
    }

    const entries = await readdir(mailingDir, { withFileTypes: true });
    const entry = entries.find((candidate) => {
      const candidateName = candidate.name.normalize('NFC');

      return candidate.isFile()
        && candidateName.toLowerCase().endsWith('.pdf')
        && candidateName.startsWith(sourceIssuePrefix);
    });

    if (entry) {
      return join(mailingDir, entry.name);
    }
  }

  return null;
}

function extractSourceIssuePrefix(sourceName: string): string | null {
  const match = /^(ЖМ\s+\d+_кв\.\s*\d+_[^_]+)/iu.exec(sourceName.normalize('NFC'));

  return match?.[1] ?? null;
}

function extractCanonicalSourceIssuePrefix(sourceName: string, slug: string): string | null {
  return sourceName.startsWith(slug) ? slug : null;
}

function issuePrefixFromSlug(slug: string): string | null {
  const match = /^(\d{4})Q([1-4])-([1-3])$/u.exec(slug);

  if (!match) {
    return null;
  }

  return `ЖМ ${match[3]}_кв. ${match[2]}_`;
}

async function findPrintPdfPath(sourceWordPath: string, slug: string): Promise<string | null> {
  const quarterDir = getSourceQuarterDir(sourceWordPath);
  const printDirs = [
    join(quarterDir, sourcePrintPdfDirName),
    join(quarterDir, 'Печать'),
  ];
  const brochureNumber = toBrochureNumber(slug);

  if (!brochureNumber) {
    return null;
  }

  for (const printDir of printDirs) {
    if (!(await pathExists(printDir))) {
      continue;
    }

    const entries = await readdir(printDir, { withFileTypes: true });
    const brochurePattern = new RegExp(`^(?:${escapeRegExp(slug)}.*|Брошюра\\s*(?:№\\s*)?${brochureNumber})\\.pdf$`, 'iu');
    const entry = entries.find((candidate) => candidate.isFile() && brochurePattern.test(candidate.name.normalize('NFC')));

    if (entry) {
      return join(printDir, entry.name);
    }
  }

  return null;
}

function toBrochureNumber(slug: string): number | null {
  const match = /^(\d{4})Q([1-4])-([1-3])$/.exec(slug);

  if (!match) {
    return null;
  }

  return (Number(match[2]) - 1) * 3 + Number(match[3]);
}

function getSourceQuarterDir(sourceWordPath: string): string {
  const sourceDir = dirname(sourceWordPath);

  return basename(sourceDir) === sourceWordDirName ? dirname(sourceDir) : dirname(dirname(sourceWordPath));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

type DownloadDocument = {
  title: string;
  subtitle: string[];
  documents: DownloadInnerDocument[];
};

type DownloadInnerDocument = {
  title: string;
  header: string[];
  paragraphs: Paragraph[];
  footer: Paragraph[];
};

function toDownloadDocument(document: PearlDocument): DownloadDocument {
  return {
    title: document.title,
    subtitle: document.sitePublication.label ? [document.sitePublication.label] : [],
    documents: document.documents.map(toDownloadInnerDocument),
  };
}

function toDownloadInnerDocument(document: PearlInnerDocument): DownloadInnerDocument {
  return {
    title: document.documentTitle ?? document.parts.header.at(-1) ?? 'Материал',
    header: document.parts.header,
    paragraphs: document.parts.body,
    footer: document.parts.footer,
  };
}

async function renderDownload(document: DownloadDocument, format: GeneratedDownloadFormat): Promise<string | Buffer> {
  if (format === 'txt') {
    return renderTxt(document);
  }

  if (format === 'docx') {
    return renderDocx(document);
  }

  return renderEpub(document);
}

function renderTxt(document: DownloadDocument): string {
  const lines = [
    document.title,
    ...document.subtitle,
    '',
    ...document.documents.flatMap((innerDocument) => [
      innerDocument.title,
      ...innerDocument.header,
      '',
      ...innerDocument.paragraphs.map((paragraph) => paragraph.text),
      '',
      ...innerDocument.footer.map((paragraph) => paragraph.text),
      '',
    ]),
    '',
  ];

  return `${lines.join('\n\n')}`;
}

async function renderDocx(document: DownloadDocument): Promise<Buffer> {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', renderDocxContentTypes());
  zip.folder('_rels')?.file('.rels', renderDocxRootRels());
  zip.folder('word')?.file('document.xml', renderDocxDocument(document));

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function renderEpub(document: DownloadDocument): Promise<Buffer> {
  const zip = new JSZip();
  const title = document.title;

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF')?.file('container.xml', renderEpubContainer());
  zip.folder('OEBPS')?.file('content.opf', renderEpubOpf(title));
  zip.folder('OEBPS')?.file('nav.xhtml', renderEpubNav(title));
  zip.folder('OEBPS')?.file('text.xhtml', renderEpubText(document));

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function renderDocxContentTypes(): string {
  return xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function renderDocxRootRels(): string {
  return xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function renderDocxDocument(document: DownloadDocument): string {
  const paragraphs = [
    renderDocxParagraph(document.title, true),
    ...document.subtitle.map((line) => renderDocxParagraph(line, false)),
    ...document.documents.flatMap((innerDocument) => [
      renderDocxParagraph(innerDocument.title, true),
      ...innerDocument.header.map((line) => renderDocxParagraph(line, false)),
      ...innerDocument.paragraphs.map((paragraph) => renderDocxParagraph(paragraph.text, false)),
      ...innerDocument.footer.map((paragraph) => renderDocxParagraph(paragraph.text, false)),
    ]),
  ].join('');

  return xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

function renderDocxParagraph(text: string, bold: boolean): string {
  const runProperties = bold ? '<w:rPr><w:b/></w:rPr>' : '';

  return `<w:p><w:r>${runProperties}<w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function renderEpubContainer(): string {
  return xml`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function renderEpubOpf(title: string): string {
  return xml`<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(title)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>ru</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="text" href="text.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="text"/>
  </spine>
</package>`;
}

function renderEpubNav(title: string): string {
  return xml`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ru">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
    <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
      <ol>
        <li><a href="text.xhtml">${escapeXml(title)}</a></li>
      </ol>
    </nav>
  </body>
</html>`;
}

function renderEpubText(document: DownloadDocument): string {
  const subtitles = document.subtitle.map((line) => `<p class="subtitle">${escapeXml(line)}</p>`).join('\n');
  const documents = document.documents.map((innerDocument) => {
    const header = innerDocument.header.map((line) => `<p class="subtitle">${escapeXml(line)}</p>`).join('\n');
    const paragraphs = innerDocument.paragraphs.map((paragraph) => `<p>${escapeXml(paragraph.text)}</p>`).join('\n');
    const footer = innerDocument.footer.map((paragraph) => `<p class="footer">${escapeXml(paragraph.text)}</p>`).join('\n');

    return `<section><h2>${escapeXml(innerDocument.title)}</h2>${header}${paragraphs}${footer}</section>`;
  }).join('\n');

  return xml`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ru">
  <head>
    <title>${escapeXml(document.title)}</title>
  </head>
  <body>
    <h1>${escapeXml(document.title)}</h1>
    ${subtitles}
    ${documents}
  </body>
</html>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xml(strings: TemplateStringsArray, ...values: string[]): string {
  return strings.reduce((result, string, index) => `${result}${string}${values[index] ?? ''}`, '').trim();
}
