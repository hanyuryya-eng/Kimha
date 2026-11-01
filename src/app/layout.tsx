import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  AudioLines,
  ArrowUpRight,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import {
  Navigation,
  ThemeToggle,
  ClientSetup,
} from "@/components/client-tools";
import { session, demoMode } from "@/lib/data/repository";
import { signOut } from "./actions";
import { environment, requestSiteOrigin } from "@/lib/environment";
import "./globals.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const requestOrigin =
    requestSiteOrigin(incoming.get("host")) ||
    requestSiteOrigin(incoming.get("x-forwarded-host"));
  const config = environment(requestOrigin);
  return {
    metadataBase: new URL(config.siteOrigin),
    robots:
      config.backend === "demo" || config.preview
        ? { index: false, follow: false }
        : undefined,
    title: { default: "지음 — 음악을 좀 더 가까이.", template: "%s | 지음" },
    description:
      "음악을 발견하고, 간직하고, 당신의 이야기를 남기는 디지털 음악 서재.",
    applicationName: "지음",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
    openGraph: {
      title: "지음 — 음악을 좀 더 가까이.",
      description: "당신의 취향이 이야기가 되는 곳.",
      locale: "ko_KR",
      type: "website",
      images: ["/opengraph-image"],
    },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151615",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await session();
  const demo = demoMode();
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          본문으로 이동
        </a>
        <ClientSetup />
        <aside className="sidebar">
          <Link className="brand" href="/">
            <AudioLines size={31} strokeWidth={1.8} />
            <span>
              지음<small>JI–EUM</small>
            </span>
          </Link>
          <p className="brand-caption">음악을 좀 더 가까이.</p>
          <Navigation />
          <div className="sidebar-note">
            <Headphones size={21} />
            <p>
              당신의 취향이
              <br />
              이야기가 되는 곳.
            </p>
            <span>듣는 순간을, 오래 간직하세요.</span>
          </div>
          <div className="sidebar-bottom">
            <Link href="/live">
              LIVE DIGGING <ArrowUpRight size={14} />
            </Link>
            <Link href="/contribute">함께 만드는 음악 서재</Link>
            {profile?.role === "admin" && (
              <Link href="/admin">
                <ShieldCheck size={15} />
                관리자
              </Link>
            )}
            <div className="policy-links">
              <Link href="/legal/privacy">개인정보</Link>
              <Link href="/legal/terms">이용약관</Link>
              <Link href="/legal/copyright">저작권</Link>
            </div>
            <small>© 2026 JI–EUM</small>
          </div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <Link href="/" className="mobile-brand">
              <AudioLines size={24} />
              지음
            </Link>
            <span className="topbar-label">YOUR PERSONAL MUSIC ARCHIVE</span>
            <div className="topbar-actions">
              <ThemeToggle />
              {user ? (
                <>
                  <Link
                    href={`/profiles/${profile?.username}`}
                    className="account"
                  >
                    <span className="avatar small" aria-hidden="true">
                      {profile?.nickname.slice(0, 1)}
                    </span>
                    <span>{profile?.nickname}</span>
                  </Link>
                  <form action={signOut}>
                    <button className="quiet-button">로그아웃</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="login-link">
                  로그인 <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          </header>
          {demo && (
            <div className="demo-banner">
              <span className="status-dot" />
              <strong>읽기 전용 데모</strong>
              <span>
                가상의 음악과 기록입니다. 저장·로그인은 Supabase 연결이
                필요합니다.
              </span>
            </div>
          )}
          <main id="main" className="content">
            {children}
          </main>
          <footer className="mobile-footer">
            <Link href="/legal/privacy">개인정보 처리방침</Link>
            <Link href="/legal/terms">이용약관</Link>
            <Link href="/legal/copyright">저작권·삭제 요청</Link>
          </footer>
        </div>
        <Navigation mobile />
      </body>
    </html>
  );
}
