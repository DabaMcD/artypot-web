import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // No @vitejs/plugin-react: tests don't need Fast Refresh, and vitest 4's
  // oxc transform handles the .tsx test files' JSX automatically (and avoids
  // the ESM-only plugin failing to load from this CommonJS project's config).
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
