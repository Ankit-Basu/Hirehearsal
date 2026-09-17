import type { NextConfig } from 'next';

/**
 * The browser always calls same-origin `/api/*`. When HIREHEARSAL_API_URL is set (or in development),
 * Next.js proxies those calls to the Spring Boot API. Without a reachable API the app runs its
 * built-in offline interviewer instead.
 */
const apiUrl = (
  process.env.HIREHEARSAL_API_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8085')
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    if (!apiUrl) {
      return [];
    }
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
