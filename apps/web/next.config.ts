// Next.js configuration for the web app (ARCHITECTURE §10).
import path from 'node:path';
import type { NextConfig } from 'next';

// Where the API runs. The browser only ever calls /api on the web app's own origin,
// and Next.js forwards those calls here, so session cookies stay first-party (ADR-0005).
const apiInternalUrl = process.env['API_INTERNAL_URL'] ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // "standalone" produces a small self-contained server for the Docker image.
  output: 'standalone',
  // The app lives in a monorepo, so file tracing starts at the repository root.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiInternalUrl}/api/:path*` }];
  },
};

export default nextConfig;
