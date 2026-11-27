import { resolve } from 'node:path';

import { readPearlDocument } from '../catalog.js';
import { listParsedJsonFiles, toPearlData } from '../catalogRows.js';
import { prisma } from '../db.js';

const rootDir = process.cwd();
const parsedDir = resolve(rootDir, 'data/parsed');

try {
  const jsonPaths = await listParsedJsonFiles(parsedDir);

  await prisma.pearlDocument.deleteMany();
  await prisma.pearl.deleteMany();

  for (const jsonPath of jsonPaths) {
    const document = await readPearlDocument(jsonPath);

    await prisma.pearl.create({
      data: toPearlData(document, jsonPath, rootDir),
    });
  }

  console.log(`Seeded ${jsonPaths.length} pearls`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
