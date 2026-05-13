import { loadPearlCatalog } from '../catalog.js';
import { prisma } from '../db.js';
import { generateDownloads } from '../downloads.js';

const rootDir = process.cwd();

try {
  const catalog = await loadPearlCatalog(rootDir);

  await generateDownloads(rootDir, catalog);

  console.log(`Generated downloads for ${catalog.length} pearls`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
