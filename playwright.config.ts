import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
  },
  webServer: [
    {
      command: 'npm run serve:dev',
      url: 'http://localhost:3001/api',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run client:dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
