import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './production',
  timeout: 30_000,
  workers: 1,
  use: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  projects: [
    // Programvarerendering: med sovende skjerm kan GPU-banen i headless Chromium henge (ReadPixels-stall).
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { args: ['--use-angle=swiftshader', '--use-gl=angle'] } } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
