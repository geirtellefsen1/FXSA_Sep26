import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test',
  timeout: 30_000,
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
    // Set only in environments that pre-install a chromium build under a path/version this
    // package doesn't expect (no matching headless-shell) — points at that binary instead of
    // downloading a fresh one. Unset elsewhere, so `playwright install`'s own browser is used.
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } } : {}),
  },
  webServer: process.env.WEB_BASE_URL
    ? undefined
    : { command: 'pnpm dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 30_000 },
});
