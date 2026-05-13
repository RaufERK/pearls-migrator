import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

import { prisma } from '../db.js';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const sampleYear = '2026';
const sampleSlug = '2026-01';
const samplePath = `/pearls/${sampleYear}/${sampleSlug}`;

let serverProcess: ChildProcess | null = null;

try {
  const wasRunning = await isServerReady();

  if (!wasRunning) {
    serverProcess = startServer();
    await waitForServer();
  }

  await checkDatabase();
  await checkHomepage();
  await checkSitemap();
  await checkPearlPage();
  await checkPearlApi();

  console.log('Smoke checks passed');
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

async function checkHomepage(): Promise<void> {
  const dbCount = await prisma.pearl.count();
  const html = await fetchText('/');
  const cardsCount = countOccurrences(html, 'class="index-card"');

  assert(cardsCount === dbCount, `Expected ${dbCount} homepage cards, got ${cardsCount}`);
  assert(html.includes(samplePath), `Expected homepage to contain ${samplePath}`);
  console.log(`Homepage cards: ${cardsCount}`);
}

async function checkSitemap(): Promise<void> {
  const xml = await fetchText('/sitemap.xml');

  assert(xml.includes(samplePath), `Expected sitemap to contain ${samplePath}`);
  console.log('Sitemap ok');
}

async function checkPearlPage(): Promise<void> {
  const html = await fetchText(samplePath);

  assert(html.includes('Жемчужины Мудрости'), 'Expected pearl page title');
  console.log('Pearl page ok');
}

async function checkPearlApi(): Promise<void> {
  const response = await fetch(`${baseUrl}/api${samplePath}`);

  assert(response.ok, `Expected API 200, got ${response.status}`);

  const data = (await response.json()) as { slug?: string; documents?: { parts?: { body?: unknown[] } }[] };

  assert(data.slug === sampleSlug, `Expected API slug ${sampleSlug}, got ${data.slug ?? 'missing'}`);
  assert(Boolean(data.documents?.[0]?.parts?.body?.length), 'Expected API inner document body paragraphs');
  console.log('Pearl API ok');
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(`${baseUrl}${path}`);

  assert(response.ok, `Expected ${path} 200, got ${response.status}`);

  return response.text();
}

function startServer(): ChildProcess {
  const child = spawn('node', ['dist/server.js'], {
    env: process.env,
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
    const response = await fetch(`${baseUrl}/robots.txt`);

    return response.ok;
  } catch {
    return false;
  }
}

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
