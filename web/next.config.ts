import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withSentryConfig } from '@sentry/nextjs';

const webDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(webDir, '..');

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default withSentryConfig(nextConfig, {
  org: 'ihg-wk',
  project: 'pearls-migrator',

  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  tunnelRoute: '/monitoring',

  silent: !process.env.CI,
});
