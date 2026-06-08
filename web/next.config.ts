import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(webDir, '..');

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
      {
        source: '/downloads/:path*',
        destination: `${apiOrigin}/downloads/:path*`,
      },
      {
        source: '/source-files/:path*',
        destination: `${apiOrigin}/source-files/:path*`,
      },
    ];
  },
};

export default nextConfig;
