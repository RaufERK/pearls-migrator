import express from 'express';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPearlCatalog, readPearlDocument } from './catalog.js';
import { downloadFormats, generateDownloads, getDownloadPath, type DownloadFormat } from './downloads.js';
import { renderPearlPage, renderTemplate } from './render.js';
import type { PearlCatalogItem, PearlDocument } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const indexTemplatePath = resolve(rootDir, 'templates/index.hbs');
const templatePath = resolve(rootDir, 'templates/pearl.hbs');
const port = Number(process.env.PORT ?? 3000);

const app = express();
const cachedDocuments = new Map<string, PearlDocument>();
const pearlCatalog = await loadPearlCatalog(rootDir);

await generateDownloads(rootDir, pearlCatalog);

app.use('/static', express.static(publicDir));

app.get('/', async (req, res, next) => {
  try {
    const siteUrl = getSiteUrl(req);
    const html = await renderTemplate(indexTemplatePath, {
      documents: pearlCatalog,
      seo: {
        title: 'Жемчужины Мудрости',
        description: 'Библиотека лекций Жемчужины Мудрости для чтения онлайн и скачивания в TXT, DOCX и EPUB.',
        canonicalUrl: `${siteUrl}/`,
      },
    });

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/robots.txt', (req, res) => {
  const siteUrl = getSiteUrl(req);

  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const siteUrl = getSiteUrl(req);
  const urls = ['/', ...pearlCatalog.map((item) => item.path)]
    .map((path) => `<url><loc>${siteUrl}${path}</loc></url>`)
    .join('');

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

app.get('/pearls/:year/:slug', async (req, res, next) => {
  try {
    const item = findPearlItem(req.params.year, req.params.slug);

    if (!item) {
      res.status(404).send('Pearl not found');
      return;
    }

    const document = await getPearlDocument(item);
    const html = await renderPearlPage(document, item, templatePath, getSiteUrl(req));

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pearls/:year/:slug', async (req, res, next) => {
  try {
    const item = findPearlItem(req.params.year, req.params.slug);

    if (!item) {
      res.status(404).json({ error: 'Pearl not found' });
      return;
    }

    const document = await getPearlDocument(item);

    res.json(document);
  } catch (error) {
    next(error);
  }
});

app.get('/downloads/:year/:file', (req, res) => {
  const format = extname(req.params.file).slice(1);
  const slug = basename(req.params.file, extname(req.params.file));

  if (!isDownloadFormat(format)) {
    res.status(404).send('Download format not found');
    return;
  }

  const item = findPearlItem(req.params.year, slug);

  if (!item) {
    res.status(404).send('Download not found');
    return;
  }

  res.download(getDownloadPath(rootDir, item, format), `${item.slug}.${format}`);
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Failed to parse PDF' });
});

app.listen(port, () => {
  console.log(`Pearls migrator is running at http://localhost:${port}`);
});

async function getPearlDocument(item: PearlCatalogItem): Promise<PearlDocument> {
  const cachedDocument = cachedDocuments.get(item.path);

  if (cachedDocument) {
    return cachedDocument;
  }

  const document = await readPearlDocument(item.jsonPath);

  cachedDocuments.set(item.path, document);

  return document;
}

function findPearlItem(year: string, slug: string): PearlCatalogItem | undefined {
  return pearlCatalog.find((item) => item.year === year && item.slug === slug);
}

function isDownloadFormat(format: string): format is DownloadFormat {
  return downloadFormats.includes(format as DownloadFormat);
}

function getSiteUrl(req: express.Request): string {
  return process.env.SITE_URL ?? `${req.protocol}://${req.get('host')}`;
}
