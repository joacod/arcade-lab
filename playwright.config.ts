import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:5173', viewport: { width: 1280, height: 1000 } },
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
