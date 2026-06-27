import { describe, it, expect } from 'vitest';
import { classifyTrackedPath, shouldCountView } from './pageview-tracking';

describe('classifyTrackedPath', () => {
  it('tracks generally-accessible static pages', () => {
    for (const p of ['/', '/about', '/tos', '/privacy', '/creator-tos', '/support', '/search', '/bounties', '/for-creators', '/login', '/register', '/forgot-password', '/reset-password']) {
      expect(classifyTrackedPath(p)).toEqual({ page_type: 'static' });
    }
  });

  it('normalizes trailing slashes and query strings', () => {
    expect(classifyTrackedPath('/about/')).toEqual({ page_type: 'static' });
    expect(classifyTrackedPath('/search?q=x')).toEqual({ page_type: 'static' });
  });

  it('classifies a platform handle page (/{platform}/{username}) as a handle', () => {
    expect(classifyTrackedPath('/kick/somestreamer')).toEqual({ page_type: 'handle', identifier: 'kick/somestreamer' });
    expect(classifyTrackedPath('/youtube/SomeChannel')).toEqual({ page_type: 'handle', identifier: 'youtube/SomeChannel' });
    expect(classifyTrackedPath('/twitch/x')).toEqual({ page_type: 'handle', identifier: 'twitch/x' });
  });

  it('classifies bounty and id-based handle pages', () => {
    expect(classifyTrackedPath('/bounties/42')).toEqual({ page_type: 'bounty', identifier: '42' });
    expect(classifyTrackedPath('/h/7')).toEqual({ page_type: 'handle', identifier: '7' });
  });

  it('classifies creator profile and creator bounties pages', () => {
    expect(classifyTrackedPath('/maya')).toEqual({ page_type: 'creator', identifier: 'maya' });
    expect(classifyTrackedPath('/maya/bounties')).toEqual({ page_type: 'creator', identifier: 'maya' });
  });

  it('does NOT classify a bare platform or the not-found /{slug}/{x} route', () => {
    // A bare platform segment isn't a page.
    expect(classifyTrackedPath('/kick')).toBeNull();
    // /{non-platform-slug}/{x} is the platform-handle route → renders not-found.
    expect(classifyTrackedPath('/maya/randomthing')).toBeNull();
  });

  it('tracks the curated fan + creator app pages as page_type app', () => {
    for (const p of [
      '/dashboard', '/backings', '/billing', '/history',
      '/settings', '/settings/password', '/settings/two-factor',
      '/become-creator', '/bounties/new',
      '/c', '/c/bounties', '/c/handles', '/c/money', '/c/payouts', '/c/settings', '/c/tax',
    ]) {
      expect(classifyTrackedPath(p)).toEqual({ page_type: 'app' });
    }
  });

  it('does NOT track internal tooling or unknown app sub-paths', () => {
    for (const p of ['/admin/users', '/obelisk', '/dashboard/xyz', '/c/junk', '/settings/unknown']) {
      expect(classifyTrackedPath(p)).toBeNull();
    }
  });
});

describe('shouldCountView', () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it('counts a real top-level document load', () => {
    expect(shouldCountView(h({ 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' }))).toBe(true);
  });

  it('does NOT count RSC requests server-side (soft-navs are counted client-side)', () => {
    // A real soft nav reaches the server as an RSC fetch, but a prefetched route
    // is served from the client cache and never does — so the browser is the
    // single source of truth for soft-navs. Skipping all RSC here avoids
    // double-counting the soft-navs that do reach the server.
    expect(shouldCountView(h({ rsc: '1', 'sec-fetch-dest': 'empty' }))).toBe(false);
  });

  it('does NOT count prefetch / prerender variants', () => {
    expect(shouldCountView(h({ rsc: '1', 'next-router-prefetch': '1' }))).toBe(false);
    expect(shouldCountView(h({ rsc: '1', 'next-router-prefetch': '2' }))).toBe(false); // PPR
    expect(shouldCountView(h({ rsc: '1', 'next-router-segment-prefetch': '/x' }))).toBe(false);
    expect(shouldCountView(h({ rsc: '1', 'sec-purpose': 'prefetch' }))).toBe(false);
    expect(shouldCountView(h({ rsc: '1', 'x-middleware-prefetch': '1' }))).toBe(false);
    expect(shouldCountView(h({ purpose: 'prefetch' }))).toBe(false);
    // A prerender that looks like a document is still vetoed.
    expect(shouldCountView(h({ 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', 'sec-purpose': 'prefetch;prerender' }))).toBe(false);
  });

  it('does NOT count subresource fetches or header-less requests', () => {
    expect(shouldCountView(h({ 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' }))).toBe(false);
    expect(shouldCountView(h({}))).toBe(false);
  });
});
