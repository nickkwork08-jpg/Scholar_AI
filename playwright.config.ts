import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  },
});