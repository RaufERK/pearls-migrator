import express from 'express';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPearlCatalog, readPearlDocument } from './catalog.js';
import { groupCatalogBySiteDate, toActiveFilterLinks, toYearFilterLinks } from './catalogView.js';
import { downloadFormats, generateDownload, getDownloadPath, type DownloadFormat } from './downloads.js';
import type { CatalogFilters, PearlCatalogItem } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const port = Number(process.env.PORT ?? 3000);

const app = express();
const pearlCatalog = await loadPearlCatalog(rootDir);

app.get('/api/catalog', async (req, res, next) => {
  try {
    const filters = getCatalogFilters(req);
    const documents = await loadPearlCatalog(rootDir, filters);
    const activeFilters = toActiveFilterLinks(filters);

    res.json({
      documentGroups: groupCatalogBySiteDate(documents),
      yearLinks: toYearFilterLinks(pearlCatalog, filters),
      filters: {
        active: activeFilters,
        hasActive: activeFilters.length > 0,
      },
    });
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

app.get('/downloads/:year/:file', async (req, res, next) => {
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

  try {
    await generateDownload(rootDir, item, format);
    res.download(getDownloadPath(rootDir, item, format), `${item.slug}.${format}`, next);
  } catch (error) {
    next(error);
  }
});

app.get('/source-files/:year/:file', (req, res) => {
  const item = pearlCatalog.find((item) => item.year === req.params.year && basename(item.sourceLabel) === req.params.file);

  if (!item) {
    res.status(404).send('Source file not found');
    return;
  }

  res.sendFile(item.sourcePath);
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const status = getErrorStatus(error);

  res.status(status).json({ error: status === 404 ? 'Not found' : 'Internal server error' });
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

function getErrorStatus(error: Error): number {
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  return 500;
}

function getCatalogFilters(req: express.Request): CatalogFilters {
  return {
    siteYear: getQueryNumber(req.query.siteYear) ?? undefined,
  };
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

