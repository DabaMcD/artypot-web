import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from './useDebouncedSearch';

describe('useDebouncedSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires exactly one request after 250ms of inactivity', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    renderHook(() => useDebouncedSearch({ query: 'ab', fetcher, delay: 250 }));

    // Nothing before the debounce elapses.
    await act(async () => { vi.advanceTimersByTime(249); });
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1); });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid keystrokes into a single trailing request', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    const { rerender } = renderHook(
      ({ q }: { q: string }) => useDebouncedSearch({ query: q, fetcher, delay: 250 }),
      { initialProps: { q: 'ab' } },
    );

    await act(async () => { vi.advanceTimersByTime(100); });
    act(() => rerender({ q: 'abc' }));
    await act(async () => { vi.advanceTimersByTime(100); });
    act(() => rerender({ q: 'abcd' }));
    await act(async () => { vi.advanceTimersByTime(250); });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('abcd', expect.any(AbortSignal));
  });

  it('aborts the in-flight request when the query changes', async () => {
    let firstSignal: AbortSignal | undefined;
    const fetcher = vi.fn((_q: string, signal: AbortSignal) => {
      if (!firstSignal) firstSignal = signal;
      return new Promise<string>(() => {}); // never resolves
    });

    const { rerender } = renderHook(
      ({ q }: { q: string }) => useDebouncedSearch({ query: q, fetcher, delay: 250 }),
      { initialProps: { q: 'ab' } },
    );

    await act(async () => { vi.advanceTimersByTime(250); });
    expect(firstSignal).toBeDefined();
    expect(firstSignal!.aborted).toBe(false);

    // New keystroke supersedes the in-flight request.
    act(() => rerender({ q: 'abc' }));
    expect(firstSignal!.aborted).toBe(true);
  });

  it('does not fire below minChars', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    renderHook(() => useDebouncedSearch({ query: 'a', fetcher, delay: 250, minChars: 2 }));
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    renderHook(() => useDebouncedSearch({ query: 'abc', fetcher, delay: 250, enabled: false }));
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
