import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// jsdom does not always expose a working localStorage; provide a deterministic
// in-memory implementation so storage-backed utilities (recent searches) are
// testable and isolated between tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

beforeEach(() => {
  globalThis.localStorage.clear();
});
