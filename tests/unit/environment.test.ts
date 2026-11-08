import { describe, expect, it } from "vitest";
import {
  resolveEnvironment,
  resolveBackend,
  requestSiteOrigin,
} from "../../src/lib/environment";

describe("배포 환경과 데이터 모드", () => {
  it("데모 모드는 남아 있는 로컬 DB 설정으로 연결하지 않는다", () => {
    expect(
      resolveEnvironment({
        dataMode: "demo",
        supabaseUrl: "http://127.0.0.1:54321",
        supabaseKey: "local-public-key",
      }).backend,
    ).toBe("demo");
  });
  it("불완전한 DB 연결을 데모 성공으로 가장하지 않는다", () => {
    expect(() =>
      resolveEnvironment({ supabaseUrl: "https://project.supabase.co" }),
    ).toThrow("함께 설정");
    expect(() => resolveEnvironment({ dataMode: "supabase" })).toThrow(
      "함께 설정",
    );
  });
  it("운영 환경에서 로컬 DB와 비밀 키를 거부한다", () => {
    expect(() =>
      resolveEnvironment({
        hosted: true,
        supabaseUrl: "http://127.0.0.1:54321",
        supabaseKey: "public",
        vercelUrl: "preview.vercel.app",
      }),
    ).toThrow("외부 HTTPS");
    expect(() =>
      resolveEnvironment({
        supabaseUrl: "https://project.supabase.co",
        supabaseKey: "sb_secret_private",
      }),
    ).toThrow("공개 키");
    const payload = btoa(JSON.stringify({ role: "service_role" }));
    expect(() =>
      resolveEnvironment({
        supabaseUrl: "https://project.supabase.co",
        supabaseKey: `header.${payload}.signature`,
      }),
    ).toThrow("service_role");
  });
  it("실제 Supabase 연결은 공개 키와 외부 URL을 함께 사용한다", () => {
    expect(
      resolveEnvironment({
        dataMode: "supabase",
        hosted: true,
        supabaseUrl: "https://project.supabase.co",
        supabaseKey: "sb_publishable_example",
        siteUrl: "https://jieum.example",
      }),
    ).toEqual({
      backend: "supabase",
      siteOrigin: "https://jieum.example",
      preview: false,
    });
  });
  it("미리보기 공유 링크는 실제 미리보기 호스트를 사용한다", () => {
    expect(
      resolveEnvironment({
        hosted: true,
        vercelEnvironment: "preview",
        vercelUrl: "jieum-preview.vercel.app",
        productionUrl: "jieum.vercel.app",
      }).siteOrigin,
    ).toBe("https://jieum-preview.vercel.app");
  });
  it("운영 공유 링크는 프로젝트 운영 도메인을 사용한다", () => {
    expect(
      resolveEnvironment({
        hosted: true,
        vercelEnvironment: "production",
        vercelUrl: "jieum-build.vercel.app",
        productionUrl: "jieum.vercel.app",
      }).siteOrigin,
    ).toBe("https://jieum.vercel.app");
  });
  it("운영 도메인 연결 전에도 요청한 배포 주소에서 공유 이미지가 열린다", () => {
    expect(
      resolveEnvironment(
        {
          hosted: true,
          vercelEnvironment: "production",
          vercelUrl: "jieum-staged.vercel.app",
          productionUrl: "jieum-unassigned.vercel.app",
        },
        requestSiteOrigin("jieum-staged.vercel.app"),
      ).siteOrigin,
    ).toBe("https://jieum-staged.vercel.app");
  });
  it("명시한 기본 주소는 배포 요청 주소보다 우선한다", () => {
    expect(
      resolveEnvironment(
        { hosted: true, siteUrl: "https://jieum.example" },
        requestSiteOrigin("jieum-staged.vercel.app"),
      ).siteOrigin,
    ).toBe("https://jieum.example");
  });
  it("배포 주소 누락·로컬 주소·인증 정보 포함 URL을 거부한다", () => {
    expect(() => resolveEnvironment({ hosted: true })).toThrow("배포 주소");
    expect(() =>
      resolveEnvironment({ hosted: true, siteUrl: "http://localhost:3000" }),
    ).toThrow("외부 HTTPS");
    expect(() =>
      resolveEnvironment({ siteUrl: "https://name:pass@example.com" }),
    ).toThrow("인증 정보");
    expect(() =>
      resolveEnvironment({ siteUrl: "https://example.com/path" }),
    ).toThrow("기본 주소");
  });
  it("임시 빌드의 데모 선택에는 아직 없는 공개 주소가 필요하지 않다", () => {
    expect(
      resolveBackend({
        dataMode: "demo",
        hosted: true,
        supabaseUrl: "http://127.0.0.1:54321",
        supabaseKey: "local-public-key",
      }),
    ).toBe("demo");
  });
  it("임시 배포는 요청 시 Vercel 호스트로 실제 공유 주소를 정한다", () => {
    const siteUrl = requestSiteOrigin("jieum-example.vercel.app");
    expect(
      resolveEnvironment({ dataMode: "demo", hosted: true, siteUrl })
        .siteOrigin,
    ).toBe("https://jieum-example.vercel.app");
  });
  it("요청 호스트를 통한 외부 주소·인증 정보·로컬 주소 주입을 거부한다", () => {
    for (const host of [
      null,
      "localhost",
      "example.com",
      "jieum.vercel.app.evil.test",
      "name:pass@jieum.vercel.app",
      "jieum.vercel.app/path",
    ])
      expect(requestSiteOrigin(host)).toBeUndefined();
  });
  it("새 임시 배포 도메인을 실제 HTTPS 공유 주소로 사용한다", () => {
    const siteUrl = requestSiteOrigin("prompt-sable-i67ngaw.tmp.now");
    expect(resolveEnvironment({ dataMode: "demo", siteUrl }).siteOrigin).toBe(
      "https://prompt-sable-i67ngaw.tmp.now",
    );
    expect(requestSiteOrigin("prompt.tmp.now.evil.test")).toBeUndefined();
  });
});
