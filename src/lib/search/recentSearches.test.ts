import { describe, it, expect, beforeEach } from 'vitest';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from './recentSearches';

describe('recentSearches', () => {
  beforeEach(() => clearRecentSearches());

  it('starts empty', () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it('adds newest first', () => {
    addRecentSearch('lorde');
    addRecentSearch('zach king');
    expect(getRecentSearches()).toEqual(['zach king', 'lorde']);
  });

  it('de-duplicates case-insensitively, moving the term to the front', () => {
    addRecentSearch('Lorde');
    addRecentSearch('beach');
    addRecentSearch('lorde');
    expect(getRecentSearches()).toEqual(['lorde', 'beach']);
  });

  it('caps at 5 entries', () => {
    ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'].forEach(addRecentSearch);
    const recent = getRecentSearches();
    expect(recent).toHaveLength(5);
    expect(recent[0]).toBe('f6');
    expect(recent).not.toContain('a1');
  });

  it('ignores blank queries', () => {
    addRecentSearch('   ');
    expect(getRecentSearches()).toEqual([]);
  });
});
