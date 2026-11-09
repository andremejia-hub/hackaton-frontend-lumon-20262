import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  workers: 1,
  use: { baseURL: "http://localhost:5173", channel: "msedge", headless: true },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_BASE_URL: "http://localhost:5173/api/v1",
      VITE_WS_BASE_URL: "ws://localhost:5173/api/v1",
    },
  },
});
