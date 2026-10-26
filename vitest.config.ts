import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
    // the pipeline specs launch Chromium and wait out real retry delays
    testTimeout: 60_000,
    hookTimeout: 60_000
  }
});
