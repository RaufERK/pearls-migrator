import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

import { prisma } from '../db.js';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001';
const sampleYear = '2026';
const sampleSlug = '2026Q2-3';
const samplePath = `/pearls/${sampleYear}/${sampleSlug}`;

let serverProcess: ChildProcess | null = null;

try {
  const wasRunning = await isServerReady();

  if (!wasRunning) {
    serverProcess = startServer();
    await waitForServer();
  }

  await checkDatabase();
  await checkCatalogApi();
  await checkPearlApi();
  await checkDownload();

  console.log('Backend smoke checks passed');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (serverProcess) {
    serverProcess.kill();
  }

  await prisma.$disconnect();
}

async function checkDatabase(): Promise<void> {
  const count = await prisma.pearl.count();

  assert(count > 0, 'Expected seeded pearls in Postgres');
  console.log(`DB pearls: ${count}`);
}

async function checkCatalogApi(): Promise<void> {
  const response = await fetch(`${baseUrl}/api/catalog?siteYear=${sampleYear}`);

  assert(response.ok, `Expected catalog API 200, got ${response.status}`);

  const data = (await response.json()) as { documentGroups?: { months?: { documents?: { path?: string }[] }[] }[] };
  const paths = data.documentGroups?.flatMap((yearGroup) => (
    yearGroup.months?.flatMap((monthGroup) => (
      monthGroup.documents?.map((document) => document.path ?? '') ?? []
    )) ?? []
  )) ?? [];

  assert(paths.includes(samplePath), `Expected catalog API to contain ${samplePath}`);
  console.log('Catalog API ok');
}

async function checkPearlApi(): Promise<void> {
  const response = await fetch(`${baseUrl}/api${samplePath}`);

  assert(response.ok, `Expected API 200, got ${response.status}`);

  const data = (await response.json()) as { slug?: string; documents?: { parts?: { body?: unknown[] } }[] };

  assert(data.slug === sampleSlug, `Expected API slug ${sampleSlug}, got ${data.slug ?? 'missing'}`);
  assert(Boolean(data.documents?.[0]?.parts?.body?.length), 'Expected API inner document body paragraphs');
  console.log('Pearl API ok');
}

async function checkDownload(): Promise<void> {
  const response = await fetch(`${baseUrl}/downloads/${sampleYear}/${sampleSlug}.txt`);

  assert(response.ok, `Expected TXT download 200, got ${response.status}`);
  assert(response.headers.get('content-disposition')?.includes(`${sampleSlug}.txt`) ?? false, 'Expected TXT attachment filename');

  const body = await response.text();

  assert(body.length > 100, 'Expected TXT download body');
  console.log('TXT download ok');
}

function startServer(): ChildProcess {
  const child = spawn('node', ['dist/server.js'], {
    env: {
      ...process.env,
      PORT: new URL(baseUrl).port || '3001',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isServerReady()) {
      return;
    }

    await wait(500);
  }

  throw new Error(`Server did not start at ${baseUrl}`);
}

async function isServerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/catalog`);

    return response.ok;
  } catch {
    return false;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
