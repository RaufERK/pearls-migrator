import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractPearlDocument } from './pdf/extractPearl.js';
import { renderPearlPage } from './render.js';
import type { PearlDocument } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const templatePath = resolve(rootDir, 'templates/pearl.hbs');
const pdfPath = resolve(rootDir, 'pearls/2006/1994_12_25_Morya.pdf');
const port = Number(process.env.PORT ?? 3000);

const app = express();
let cachedDocument: PearlDocument | undefined;

app.use('/static', express.static(publicDir));

app.get('/', (_req, res) => {
  res.redirect('/pearls/2006/1994-12-25-morya');
});

app.get('/pearls/2006/1994-12-25-morya', async (_req, res, next) => {
  try {
    const document = await getPearlDocument();
    const html = await renderPearlPage(document, templatePath);

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/api/pearls/2006/1994-12-25-morya', async (_req, res, next) => {
  try {
    const document = await getPearlDocument();

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

async function getPearlDocument(): Promise<PearlDocument> {
  cachedDocument ??= await extractPearlDocument(pdfPath);

  return cachedDocument;
}
