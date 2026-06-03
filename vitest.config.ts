import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // No @vitejs/plugin-react: tests don't need Fast Refresh, and esbuild's
  // automatic JSX runtime handles the .tsx test files fine (and avoids the
  // ESM-only plugin failing to load from this CommonJS project's config).
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
