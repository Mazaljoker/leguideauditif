import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
// Si .env.test existe, ses valeurs ecrasent .env / .env.local (mode Stripe test)
if (fs.existsSync('.env.test')) {
  dotenv.config({ path: '.env.test', override: true });
}

const hasStripeTest = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
// En mode test Stripe, le dev server doit charger .env.test (Vite --mode=test)
const devCommand = hasStripeTest ? 'astro dev --mode=test' : 'astro dev';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: devCommand,
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
