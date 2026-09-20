import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testIgnore: '**/production/**',
  timeout: 60_000,
  // devices['iPhone 12'] sets defaultBrowserType 'webkit'; only chromium is installed, so pin it explicitly.
  use: { ...devices['iPhone 12'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 }, baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3000 --no-open', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 60_000 },
});
