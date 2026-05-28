import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy /creator/* URLs (old bookmarks, indexed pages, dispatched emails)
      // permanently redirect to the shorter /c/* base.
      { source: '/creator', destination: '/c', permanent: true },
      { source: '/creator/:path*', destination: '/c/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
