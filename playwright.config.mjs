import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./cv",
  testMatch: "pdf.integration.spec.mjs",
  use: {
    baseURL: "http://127.0.0.1:8000",
    browserName: "webkit",
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8000/cv/",
    reuseExistingServer: !process.env.CI,
  },
});
