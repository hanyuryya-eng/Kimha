import { test, expect } from "@playwright/test";
test.skip(!process.env.E2E_BASE_URL, "배포된 HTTPS 주소의 검증 전용");

test("배포된 홈과 공유 이미지가 공개 HTTPS 주소를 사용한다", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: /좋아하는 음악에는/ }),
  ).toBeVisible();
  const value = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(value).toBeTruthy();
  const url = new URL(value!);
  expect(url.protocol).toBe("https:");
  expect(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]).not.toContain(
    url.hostname,
  );
  const image = await request.get(url.href);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toMatch(/^image\//);
});
