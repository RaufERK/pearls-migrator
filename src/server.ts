import express from 'express';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalogFilterHref, loadPearlCatalog, readPearlDocument } from './catalog.js';
import { downloadFormats, getDownloadPath, type DownloadFormat } from './downloads.js';
import { renderPearlPage, renderTemplate } from './render.js';
import type { CatalogFilterLink, CatalogFilters, PearlCatalogItem } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const indexTemplatePath = resolve(rootDir, 'templates/index.hbs');
const templatePath = resolve(rootDir, 'templates/pearl.hbs');
const port = Number(process.env.PORT ?? 3000);

const app = express();
const pearlCatalog = await loadPearlCatalog(rootDir);

type CatalogMonthGroup = {
  label: string;
  documents: PearlCatalogItem[];
};

type CatalogYearGroup = {
  year: string;
  months: CatalogMonthGroup[];
};

app.use('/static', express.static(publicDir));

app.get('/', async (req, res, next) => {
  try {
    const siteUrl = getSiteUrl(req);
    const filters = getCatalogFilters(req);
    const documents = await loadPearlCatalog(rootDir, filters);
    const activeFilters = toActiveFilterLinks(filters);
    const html = await renderTemplate(indexTemplatePath, {
      documentGroups: groupCatalogBySiteDate(documents),
      filters: {
        active: activeFilters,
        hasActive: activeFilters.length > 0,
      },
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

    const document = await readPearlDocument(item.jsonPath);
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

    const document = await readPearlDocument(item.jsonPath);

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

function findPearlItem(year: string, slug: string): PearlCatalogItem | undefined {
  return pearlCatalog.find((item) => item.year === year && item.slug === slug);
}

function isDownloadFormat(format: string): format is DownloadFormat {
  return downloadFormats.includes(format as DownloadFormat);
}

function getSiteUrl(req: express.Request): string {
  return process.env.SITE_URL ?? `${req.protocol}://${req.get('host')}`;
}

function getCatalogFilters(req: express.Request): CatalogFilters {
  void req;

  return {};
}

function groupCatalogBySiteDate(documents: PearlCatalogItem[]): CatalogYearGroup[] {
  const yearGroups: CatalogYearGroup[] = [];

  for (const document of documents) {
    const year = String(document.siteYear);
    let yearGroup = yearGroups.find((group) => group.year === year);

    if (!yearGroup) {
      yearGroup = {
        year,
        months: [],
      };
      yearGroups.push(yearGroup);
    }

    const monthLabel = document.siteMonth ? document.siteMonthLabel : year;
    let monthGroup = yearGroup.months.find((group) => group.label === monthLabel);

    if (!monthGroup) {
      monthGroup = {
        label: monthLabel,
        documents: [],
      };
      yearGroup.months.push(monthGroup);
    }

    monthGroup.documents.push(document);
  }

  return yearGroups;
}

function getQueryString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getQueryNumber(value: unknown): number | null {
  const stringValue = getQueryString(value);

  if (!stringValue) {
    return null;
  }

  const numberValue = Number(stringValue);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function toActiveFilterLinks(filters: CatalogFilters): CatalogFilterLink[] {
  const activeFilters: CatalogFilterLink[] = [];

  if (filters.siteYear) {
    activeFilters.push({
      label: `Год сайта: ${filters.siteYear}`,
      href: buildCatalogFilterHref(filters, { siteYear: null }),
    });
  }

  return activeFilters;
}
