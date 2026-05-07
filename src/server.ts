import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from './pdf/extractPearl.js';
import { renderPearlPage, renderTemplate } from './render.js';
import type { PearlDocument } from './types.js';

type PearlRoute = {
  slug: string;
  path: string;
  sourcePath: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const indexTemplatePath = resolve(rootDir, 'templates/index.hbs');
const templatePath = resolve(rootDir, 'templates/pearl.hbs');
const port = Number(process.env.PORT ?? 3000);
const pearlRoutes: PearlRoute[] = [
  {
    slug: '1994-12-25-morya',
    path: '/pearls/2006/1994-12-25-morya',
    sourcePath: 'pearls/2006/1994_12_25_Morya.pdf',
  },
  {
    slug: '2026q1-1',
    path: '/pearls/2026/2026q1-1',
    sourcePath: 'pearls/2026/2026Q1-1.pdf',
  },
];

const app = express();
const cachedDocuments = new Map<string, PearlDocument>();

app.use('/static', express.static(publicDir));

app.get('/', async (_req, res, next) => {
  try {
    const documents = await Promise.all(
      pearlRoutes.map(async (route) => {
        const document = await getPearlDocument(route);

        return {
          ...route,
          title: document.title,
          subtitle: document.subtitle.join(' · '),
          pages: document.meta.pages,
          paragraphs: document.paragraphs.length,
          layout: document.meta.layout,
        };
      }),
    );
    const html = await renderTemplate(indexTemplatePath, { documents });

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/pearls/:year/:slug', async (req, res, next) => {
  try {
    const route = findPearlRoute(req.path);

    if (!route) {
      res.status(404).send('Pearl not found');
      return;
    }

    const document = await getPearlDocument(route);
    const html = await renderPearlPage(document, templatePath);

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pearls/:year/:slug', async (req, res, next) => {
  try {
    const route = findPearlRoute(req.path.replace('/api', ''));

    if (!route) {
      res.status(404).json({ error: 'Pearl not found' });
      return;
    }

    const document = await getPearlDocument(route);

    res.json(document);
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Failed to parse PDF' });
});

app.listen(port, () => {
  console.log(`Pearls migrator is running at http://localhost:${port}`);
});

async function getPearlDocument(route: PearlRoute): Promise<PearlDocument> {
  const cachedDocument = cachedDocuments.get(route.slug);

  if (cachedDocument) {
    return cachedDocument;
  }

  const document = await extractPearlDocument(resolve(rootDir, route.sourcePath));

  cachedDocuments.set(route.slug, document);

  return document;
}

function findPearlRoute(path: string): PearlRoute | undefined {
  return pearlRoutes.find((route) => route.path === path);
}
