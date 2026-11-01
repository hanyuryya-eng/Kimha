import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localStatus } from "../../scripts/supabase.mjs";
const connected = process.env.E2E_CONNECTED === "1";
test.skip(!connected, "로컬 Supabase 연결 전용 테스트");
const suffix = randomUUID().slice(0, 8),
  email = `browser-${suffix}@example.com`,
  password = randomUUID() + "JiEum!";
const adminEmail = `editor-${suffix}@example.com`,
  adminPassword = randomUUID() + "JiEum!";
const first = "00000002-0000-4000-8000-000000000001",
  second = "00000002-0000-4000-8000-000000000002";
let root: SupabaseClient,
  userId = "",
  adminId = "",
  fixtureLinkId = "";
test.beforeAll(async () => {
  if (!connected) return;
  const s = localStatus();
  if (!["localhost", "127.0.0.1"].includes(new URL(s.API_URL).hostname))
    throw new Error("E2E는 로컬 DB만 사용합니다.");
  root = createClient(s.API_URL, s.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await root.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { nickname: "테스트 운영자" },
  });
  expect(error).toBeNull();
  adminId = data.user!.id;
  const result = await root
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", adminId);
  expect(result.error).toBeNull();
});
test.afterAll(async () => {
  if (!connected) return;
  if (fixtureLinkId)
    await root.from("external_music_links").delete().eq("id", fixtureLinkId);
  const records = await root
    .from("user_notes")
    .select("user_id")
    .like("body", `%${suffix}%`);
  for (const r of records.data || []) if (!userId) userId = r.user_id;
  for (const id of [userId, adminId].filter(Boolean))
    await root.auth.admin.deleteUser(id);
});
test("A–H: 가입·검색·저장·목록·비공개→공개·공유·기여 승인·공연 상태를 실제 DB에 저장한다", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.goto("/login?mode=signup");
  await page
    .getByRole("textbox", { name: "닉네임", exact: true })
    .fill(`음악가_${suffix}`);
  await page.getByRole("textbox", { name: "이메일", exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  const users = await root.auth.admin.listUsers();
  userId = users.data.users.find((u) => u.email === email)!.id;
  await page.goto("/?q=아주느린밤");
  await page
    .getByRole("link")
    .filter({ hasText: "아주 느린 밤" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "내 서재에 저장", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "서재에 저장됨", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "서재에 저장됨", exact: true }),
  ).toBeVisible();
  await page.goto("/playlists/new");
  await page
    .getByRole("textbox", { name: "플레이리스트 이름" })
    .fill(`밤의 드라이브 ${suffix}`);
  await page
    .getByRole("textbox", { name: "소개", exact: true })
    .fill("브라우저 통합 테스트");
  await page
    .getByRole("button", { name: "플레이리스트 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `밤의 드라이브 ${suffix}`, exact: true }),
  ).toBeVisible();
  const playlistUrl = page.url();
  await page.getByLabel("플레이리스트에 음악 추가").selectOption(first);
  await page.getByRole("button", { name: "곡 추가", exact: true }).click();
  await expect(page.getByText("플레이리스트를 변경했습니다.")).toBeVisible();
  await page.getByLabel("플레이리스트에 음악 추가").selectOption(second);
  await page.getByRole("button", { name: "곡 추가", exact: true }).click();
  await expect(
    page.getByRole("link").filter({ hasText: "파도가 남긴 말" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "아래로", exact: true })
    .first()
    .click();
  await expect(page.locator(".playlist-item").first()).toContainText(
    "파도가 남긴 말",
  );
  await page.reload();
  await expect(page.locator(".playlist-item").first()).toContainText(
    "파도가 남긴 말",
  );
  await page.goto(`/write?track=${first}`);
  const privateText = `음악에 남기는 비공개 이야기 ${suffix} <script>window.jiEumXss=true</script>`;
  await expect(
    page.getByRole("radio", { name: "나만 보기 · 비공개" }),
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "2. 음악에 남기는 마음" })
    .fill(privateText);
  await page.getByRole("button", { name: "기록 저장하기" }).click();
  await expect(page.getByText(privateText, { exact: true })).toBeVisible();
  await expect(page.locator(".note-content script")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "jiEumXss")),
  ).toBeUndefined();
  const noteUrl = page.url(),
    noteId = noteUrl.split("/").pop()!;
  await expect(page.getByRole("button", { name: "공유하기" })).toHaveCount(0);
  const guest = await browser.newContext();
  const other = await guest.newPage();
  await other.goto(noteUrl);
  await expect(other.getByText(privateText, { exact: true })).toHaveCount(0);
  await expect(
    other.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  await other.goto(playlistUrl);
  await expect(
    other.getByRole("heading", {
      name: `밤의 드라이브 ${suffix}`,
      exact: true,
    }),
  ).toHaveCount(0);
  const author = await root
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  await other.goto(`/profiles/${author.data!.username}`);
  await expect(other.getByText(privateText, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "수정하기", exact: true }).click();
  await page.getByRole("radio", { name: "모두에게 공개" }).check();
  await page.getByRole("button", { name: "기록 수정하기" }).click();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "공유하기", exact: true }).click();
  await expect(page.getByText("링크를 복사했습니다.")).toBeVisible();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(sharedUrl).toBe(noteUrl);
  await other.goto(sharedUrl);
  await expect(other.getByText(privateText, { exact: true })).toBeVisible();
  await expect(
    other.locator('meta[property="og:description"]'),
  ).toHaveAttribute("content", privateText);
  await guest.close();
  await page.goto(`/contribute?track=${first}`);
  await page
    .getByRole("textbox", { name: "제목", exact: true })
    .fill(`브라우저 음악 이야기 ${suffix}`);
  await page
    .getByRole("textbox", { name: "이야기 또는 정정 내용" })
    .fill("통합 테스트용 독자적 해설. 실제 음악 지식이 아닙니다.");
  await page
    .getByRole("textbox", { name: "출처 URL (HTTPS)" })
    .fill("https://example.com/e2e-source");
  await page.getByRole("button", { name: "검토 요청 보내기" }).click();
  await expect(
    page.getByText("검토 대기 중입니다. 승인 후 공식 해설에 반영됩니다."),
  ).toBeVisible();
  await page.goto("/live/00000006-0000-4000-8000-000000000001");
  const item = page.locator(".live-item").first();
  await item.getByRole("combobox").selectOption("singalong");
  await item.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("디깅 상태를 저장했습니다.")).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".live-item").first().getByRole("combobox"),
  ).toHaveValue("singalong");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "이메일", exact: true })
    .fill(adminEmail);
  await page.getByLabel("비밀번호", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.goto("/admin");
  const proposal = page.locator(".admin-item").filter({
    has: page.getByRole("heading", {
      name: `브라우저 음악 이야기 ${suffix}`,
      exact: true,
    }),
  });
  await proposal
    .getByRole("textbox", { name: "검토 의견" })
    .fill("테스트 승인");
  await proposal.getByRole("button", { name: "검토 완료" }).click();
  await expect(proposal).toHaveCount(0);
  const ledger = await root
    .from("point_ledger")
    .select("*")
    .eq("user_id", userId);
  expect(ledger.data).toHaveLength(1);
  expect(ledger.data![0].amount).toBe(10);
  const stories = await root
    .from("music_stories")
    .select("*")
    .eq("author_id", userId);
  expect(stories.data).toHaveLength(1);
  await page.goto(`/tracks/${first}`);
  await expect(
    page.getByRole("heading", {
      name: `브라우저 음악 이야기 ${suffix}`,
      exact: true,
    }),
  ).toBeVisible();
  await root.from("music_stories").delete().eq("author_id", userId);
  // The browser validates a registered service link without fabricating a playable URL for a demo song.
  const link = await root
    .from("external_music_links")
    .insert({
      track_id: first,
      service: "youtube",
      url: "https://www.youtube.com/watch?v=u5CVsCnxyXg",
    })
    .select()
    .single();
  expect(link.error).toBeNull();
  fixtureLinkId = link.data!.id;
  await page.reload();
  await expect(
    page.getByRole("link", { name: "youtube에서 듣기" }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=u5CVsCnxyXg");
  await root.from("external_music_links").delete().eq("id", link.data!.id);
  const stored = await root
    .from("user_notes")
    .select("*")
    .eq("id", noteId)
    .single();
  expect(stored.data?.visibility).toBe("public");
});
