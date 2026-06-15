import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3020';
const sampleYear = '2026';
const sampleSlug = '2026Q2-3';
const samplePath = `/pearls/${sampleYear}/${sampleSlug}`;
const port = new URL(baseUrl).port || '3020';

let serverProcess: ChildProcess | null = null;

try {
  const wasRunning = await isServerReady();

  if (!wasRunning) {
    serverProcess = startServer();
    await waitForServer();
  }

  await checkHealth();
  await checkHomepage();
  await checkPearlPage();
  await checkSitemap();
  await checkDownload();

  console.log('Next smoke checks passed');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (serverProcess) {
    serverProcess.kill();
  }
}

async function checkHealth(): Promise<void> {
  const response = await fetch(`${baseUrl}/health`);

  assert(response.ok, `Expected health 200, got ${response.status}`);
  console.log('Health ok');
}

async function checkHomepage(): Promise<void> {
  const html = await fetchText('/');

  assert(html.includes(samplePath), `Expected homepage to contain ${samplePath}`);
  console.log('Homepage ok');
}

async function checkPearlPage(): Promise<void> {
  const html = await fetchText(samplePath);

  assert(html.includes('Жемчужины Мудрости'), 'Expected pearl page content');
  console.log('Pearl page ok');
}

async function checkSitemap(): Promise<void> {
  const xml = await fetchText('/sitemap.xml');

  assert(xml.includes(samplePath), `Expected sitemap to contain ${samplePath}`);
  console.log('Sitemap ok');
}

async function checkDownload(): Promise<void> {
  const pdfResponse = await fetch(`${baseUrl}/downloads/${sampleYear}/${sampleSlug}.pdf`);

  assert(pdfResponse.ok, `Expected PDF download 200, got ${pdfResponse.status}`);
  assert(pdfResponse.headers.get('content-type')?.includes('application/pdf') ?? false, 'Expected PDF content type');
  console.log('PDF download ok');

  const txtResponse = await fetch(`${baseUrl}/downloads/${sampleYear}/${sampleSlug}.txt`);

  assert(txtResponse.ok, `Expected TXT download 200, got ${txtResponse.status}`);

  const body = await txtResponse.text();

  assert(body.length > 100, 'Expected TXT download body');
  console.log('TXT download ok');
}

function startServer(): ChildProcess {
  const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', port], {
    cwd: resolve(process.cwd(), 'web'),
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
    const response = await fetch(`${baseUrl}/health`);

    return response.ok;
  } catch {
    return false;
  }
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(`${baseUrl}${path}`);

  assert(response.ok, `Expected ${path} 200, got ${response.status}`);

  return response.text();
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
