import { defineConfig, devices } from "@playwright/test";

// `baseURL` configurable por variable de entorno: en CI corre contra un
// `next start` local en el runner; se puede apuntar contra `dev` desplegado
// pasando E2E_BASE_URL sin tocar este archivo (FUT-82, requisito 9).
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Solo levanta un server propio si no nos dieron una URL externa (dev/prod)
  // contra la que correr. Ver docs de FUT-82: requisito 9.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
