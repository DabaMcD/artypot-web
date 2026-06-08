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
      // Consolidated creator panel: the money pages (balance / withdraw / ledger)
      // merged into a single /c/money hub, and the redundant work stubs
      // (queue / my-bounties) folded into /c/bounties.
      { source: '/c/balance', destination: '/c/money', permanent: true },
      { source: '/c/withdraw', destination: '/c/money', permanent: true },
      { source: '/c/ledger', destination: '/c/money', permanent: true },
      { source: '/c/queue', destination: '/c/bounties', permanent: true },
      { source: '/c/my-bounties', destination: '/c/bounties', permanent: true },
      // /admin has no landing page — every section lives in the council
      // sidebar. Bounce to the canonical default queue. Non-council users
      // get re-redirected away by the destination page's own auth gate.
      { source: '/admin', destination: '/admin/completions', permanent: false },
    ];
  },
};

export default nextConfig;
