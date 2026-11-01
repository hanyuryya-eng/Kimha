import { defineConfig, devices } from "@playwright/test";
const connected = process.env.E2E_CONNECTED === "1";
const remote = process.env.E2E_BASE_URL;
const port = process.env.E2E_PORT || "3000";
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)
  throw new Error("올바른 E2E_PORT가 필요합니다.");
if (remote) {
  const url = new URL(remote);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("원격 검증에는 인증 정보 없는 HTTPS 주소가 필요합니다.");
  if (connected)
    throw new Error("DB 계정을 생성하는 통합 테스트는 로컬에서만 실행합니다.");
}
const baseURL = remote || `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  projects: [
    {
      name: connected
        ? "supabase-chromium"
        : remote
          ? "deployed-demo-chromium"
          : "demo-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: remote
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
