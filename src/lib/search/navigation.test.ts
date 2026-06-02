import { describe, it, expect } from 'vitest';
import { moveActiveIndex, buildSearchHref, buildCreateBountyHref } from './navigation';

describe('moveActiveIndex', () => {
  it('moves forward', () => {
    expect(moveActiveIndex(0, 1, 3)).toBe(1);
  });

  it('wraps from last to first', () => {
    expect(moveActiveIndex(2, 1, 3)).toBe(0);
  });

  it('wraps from first to last going up', () => {
    expect(moveActiveIndex(0, -1, 3)).toBe(2);
  });

  it('returns -1 when there are no items', () => {
    expect(moveActiveIndex(0, 1, 0)).toBe(-1);
  });
});

describe('buildCreateBountyHref', () => {
  it('prefills the query as the handle param', () => {
    expect(buildCreateBountyHref('lorde')).toBe('/bounties/new?handle=lorde');
  });

  it('encodes special characters', () => {
    expect(buildCreateBountyHref('a b&c')).toBe('/bounties/new?handle=a%20b%26c');
  });
});

describe('buildSearchHref', () => {
  it('builds the full-results URL', () => {
    expect(buildSearchHref('solar power')).toBe('/search?q=solar%20power');
  });
});
