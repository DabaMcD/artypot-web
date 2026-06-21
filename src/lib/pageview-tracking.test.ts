import { describe, it, expect } from 'vitest';
import { classifyTrackedPath } from './pageview-tracking';

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

  it('does NOT track auth-gated or app routes', () => {
    for (const p of ['/dashboard', '/settings', '/billing', '/admin/users', '/c/bounties', '/obelisk', '/become-creator']) {
      expect(classifyTrackedPath(p)).toBeNull();
    }
  });
});
