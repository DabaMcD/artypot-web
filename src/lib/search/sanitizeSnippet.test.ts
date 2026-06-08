import { describe, it, expect } from 'vitest';
import { sanitizeSnippet } from './sanitizeSnippet';

describe('sanitizeSnippet', () => {
  it('keeps <mark> tags', () => {
    const out = sanitizeSnippet('the <mark>solar</mark> demo');
    expect(out).toBe('the <mark>solar</mark> demo');
  });

  it('strips a <script> injection but keeps surrounding text', () => {
    const out = sanitizeSnippet('hi <script>alert(1)</script> <mark>zebra</mark>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('alert(1)</script');
    expect(out).toContain('<mark>zebra</mark>');
  });

  it('strips attributes from mark tags', () => {
    const out = sanitizeSnippet('<mark onclick="evil()">x</mark>');
    expect(out).toBe('<mark>x</mark>');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeSnippet(null)).toBe('');
    expect(sanitizeSnippet(undefined)).toBe('');
  });
});
