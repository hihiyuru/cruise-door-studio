import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end scenarios from docs/scenario-map.html, run against the production build (with its
 * Content Security Policy) served by `vite preview`. Locally the installed Chrome is used so nothing
 * has to be downloaded; CI installs Playwright's Chromium.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/cruise-door-studio/',
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
    ...(process.env.CI ? {} : { channel: 'chrome' }),
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/cruise-door-studio/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
