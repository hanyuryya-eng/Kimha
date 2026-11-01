import { describe, it, expect } from "vitest";
import {
  normalizeSearch,
  noteSchema,
  playlistSchema,
  contributionSchema,
  safeHttps,
  safeMusicUrl,
  mayShowLyrics,
  localPath,
} from "../../src/lib/domain";
import demo from "../../src/lib/data/demo.json";
describe("곡 검색 정규화", () => {
  it("공백, 영문 대소문자, 기호, 전각 문자를 정규화한다", () => {
    expect(normalizeSearch("Ｂｌｕｅ - Hour")).toBe(
      normalizeSearch("bluehour"),
    );
    expect(normalizeSearch("아주 느린 밤")).toBe("아주느린밤");
  });
  it("영문 별칭과 한국어 곡을 연결한다", () => {
    expect(
      demo.tracks.filter((t) =>
        [t.title, ...t.aliases].some((v) =>
          normalizeSearch(v).includes(normalizeSearch("a very slow")),
        ),
      ),
    ).toHaveLength(1);
  });
});
describe("개인 기록과 플레이리스트", () => {
  const note = {
    track_id: demo.tracks[0].id,
    body: "한 줄의 마음",
    kind: "impression",
  };
  it("기록은 기본 비공개다", () =>
    expect(noteSchema.parse(note).visibility).toBe("private"));
  it("공개는 명시적으로 선택한다", () =>
    expect(noteSchema.parse({ ...note, visibility: "public" }).visibility).toBe(
      "public",
    ));
  it("빈 글과 긴 글을 거부한다", () => {
    expect(noteSchema.safeParse({ ...note, body: "   " }).success).toBe(false);
    expect(
      noteSchema.safeParse({ ...note, body: "가".repeat(3001) }).success,
    ).toBe(false);
  });
  it("가짜 UUID와 유형을 거부한다", () => {
    expect(noteSchema.safeParse({ ...note, track_id: "bad" }).success).toBe(
      false,
    );
    expect(noteSchema.safeParse({ ...note, kind: "other" }).success).toBe(
      false,
    );
  });
  it("플레이리스트는 비공개이며 이름이 필요하다", () => {
    expect(
      playlistSchema.parse({ name: "밤의 드라이브", description: "" })
        .visibility,
    ).toBe("private");
    expect(
      playlistSchema.safeParse({ name: " ", description: "" }).success,
    ).toBe(false);
  });
});
describe("안전한 링크", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "http://example.com",
    "https://user:secret@example.com",
    "not-a-url",
  ])("위험하거나 미지원인 URL을 차단한다: %s", (url) =>
    expect(safeHttps(url)).toBeNull(),
  );
  it("HTTPS 링크를 허용한다", () =>
    expect(safeHttps("https://example.com/source")).toBe(
      "https://example.com/source",
    ));
  it("음악 서비스의 호스트를 검증한다", () => {
    expect(
      safeMusicUrl("spotify", "https://open.spotify.com/track/example"),
    ).toBeTruthy();
    expect(
      safeMusicUrl("spotify", "https://open.spotify.com.evil.test/track/1"),
    ).toBeNull();
    expect(
      safeMusicUrl("bandcamp", "https://artist.bandcamp.com/track/song"),
    ).toBeTruthy();
  });
  it("외부 복귀 주소를 차단한다", () => {
    expect(localPath("//evil.test")).toBe("/library");
    expect(localPath("/%2fevil.test")).toBe("/library");
    expect(localPath("/%5cevil.test")).toBe("/library");
    expect(localPath("https://evil.test")).toBe("/library");
    expect(localPath("/tracks/abc")).toBe("/tracks/abc");
  });
  it("기여 출처에 실행 가능한 URL을 허용하지 않는다", () =>
    expect(
      contributionSchema.safeParse({
        track_id: demo.tracks[0].id,
        kind: "story",
        title: "제안",
        body: "설명",
        source_url: "javascript:alert(1)",
      }).success,
    ).toBe(false));
});
describe("가사 이용권", () => {
  const rights = {
    status: "verified",
    license_reference: "local test license",
    expires_at: null,
  };
  it("미확인과 만료 상태를 거부한다", () => {
    expect(mayShowLyrics(null)).toBe(false);
    expect(mayShowLyrics({ ...rights, status: "unverified" })).toBe(false);
    expect(mayShowLyrics({ ...rights, license_reference: null })).toBe(false);
    expect(mayShowLyrics({ ...rights, expires_at: "2000-01-01" })).toBe(false);
  });
  it("권리가 유효한 경우에만 표시한다", () =>
    expect(mayShowLyrics(rights)).toBe(true));
});
