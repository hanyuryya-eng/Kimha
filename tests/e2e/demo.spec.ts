import { test, expect } from "@playwright/test";
test.skip(process.env.E2E_CONNECTED === "1", "읽기 전용 데모 전용 테스트");
test("데모 검색 → 곡 상세 → 실제 링크가 없음을 안내한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("읽기 전용 데모", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "음악 검색" }).fill("A Very Slow");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByText("‘A Very Slow’ 검색 결과")).toBeVisible();
  await page
    .getByRole("link")
    .filter({ hasText: "아주 느린 밤" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "아주 느린 밤", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "내 서재에 저장", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/확인된 외부 곡 링크가 없습니다/)).toBeVisible();
  await page.screenshot({
    path: "test-results/track-desktop.png",
    fullPage: true,
  });
});
test("검색 정규화, 아티스트 검색, 미등록 곡 등록 요청", async ({ page }) => {
  await page.goto("/?q=블루아워&tab=artists");
  await expect(
    page.getByRole("heading", { name: "블루 아워", exact: true }),
  ).toBeVisible();
  await page.goto("/?q=없는음악XYZ");
  await page.getByRole("link", { name: "이 음악을 등록 요청하기" }).click();
  await expect(
    page.getByRole("textbox", { name: "제목", exact: true }),
  ).toHaveValue("없는음악XYZ");
  await expect(
    page.getByRole("button", { name: "검토 요청 보내기" }),
  ).toBeDisabled();
});
test("공개 기록·프로필·공개 플레이리스트를 비회원이 읽는다", async ({
  page,
}) => {
  await page.goto("/notes/00000004-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { name: "아주 느린 밤", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "수정하기", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "느린 리스너", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "느린 리스너", exact: true }),
  ).toBeVisible();
  await page.getByRole("link").filter({ hasText: "밤의 드라이브" }).click();
  await expect(
    page.getByRole("heading", { name: "밤의 드라이브", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "곡 삭제" })).toHaveCount(0);
});
test("기록은 비공개 기본이며 데모는 저장·로그인을 허용하지 않는다", async ({
  page,
}) => {
  await page.goto("/write");
  await expect(
    page.getByRole("radio", { name: "나만 보기 · 비공개" }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "기록 저장하기" }),
  ).toBeDisabled();
  await page.goto("/login?mode=signup");
  await expect(
    page.getByRole("button", { name: "회원가입", exact: true }),
  ).toBeDisabled();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" }),
  ).toBeVisible();
});
test("모바일 화면·키보드·테마·PWA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "모바일 주요 메뉴" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: /좋아하는 음악에는/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "화면 테마 전환" }).click();
  await expect(page.locator("html")).toHaveClass("light");
  await page
    .getByRole("navigation", { name: "모바일 주요 메뉴" })
    .getByRole("link", { name: "내 서재", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "나의 음악 서재" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "모바일 주요 메뉴" })
    .getByRole("link", { name: "기록", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "2. 음악에 남기는 마음" }),
  ).toBeVisible();
  const r = await page.request.get("/manifest.webmanifest");
  expect(r.ok()).toBe(true);
  expect((await r.json()).display).toBe("standalone");
});
test("공연·출처 정책·최근 검색 삭제", async ({ page }) => {
  await page.goto("/live");
  await page.getByRole("link").filter({ hasText: "느린 숲 페스티벌" }).click();
  await expect(
    page.getByText("팬 추천 · 셋리스트 미확정").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "저장", exact: true }).first(),
  ).toBeDisabled();
  await page.goto("/legal/copyright");
  await expect(
    page.getByText("법적 검토 전 초안 · 2026년 10월 31일"),
  ).toBeVisible();
  await page.goto("/?q=테스트");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "최근 검색 지우기" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "최근 검색 지우기" }).click();
  await expect(page.getByText("최근 검색", { exact: true })).toHaveCount(0);
});

test("키보드 검색과 주요 모바일 화면의 가로 넘침을 확인한다", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 이동" })).toBeFocused();
  const search = page.getByRole("searchbox", { name: "음악 검색" });
  await search.fill("오월의 숲");
  await search.press("Enter");
  await expect(page.getByText("‘오월의 숲’ 검색 결과")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of [
    "/write",
    "/tracks/00000002-0000-4000-8000-000000000001",
    "/playlists/00000007-0000-4000-8000-000000000001",
    "/live/00000006-0000-4000-8000-000000000001",
    "/login?mode=signup",
    "/contribute",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
});
