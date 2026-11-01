"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Compass,
  Library,
  PenLine,
  Moon,
  Share2,
  Search,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const items = [
    {
      href: "/",
      icon: Compass,
      label: "디깅",
      active:
        path === "/" ||
        path.startsWith("/tracks") ||
        path.startsWith("/live") ||
        path.startsWith("/artists"),
    },
    {
      href: "/library",
      icon: Library,
      label: "내 서재",
      active: path.startsWith("/library") || path.startsWith("/playlists"),
    },
    {
      href: "/write",
      icon: PenLine,
      label: "기록",
      active: path.startsWith("/write"),
    },
  ];
  return (
    <nav
      aria-label={mobile ? "모바일 주요 메뉴" : "주요 메뉴"}
      className={mobile ? "mobile-nav" : "side-nav"}
    >
      {items.map(({ href, icon: Icon, label, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={active ? "active" : ""}
        >
          <Icon size={20} />
          <span>{label}</span>
          {!mobile && <span className="nav-dot" />}
        </Link>
      ))}
    </nav>
  );
}
export function ThemeToggle() {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="화면 테마 전환"
      onClick={() => {
        const light = document.documentElement.classList.toggle("light");
        localStorage.setItem("ji-eum-theme", light ? "light" : "dark");
      }}
    >
      <Moon size={19} />
    </Button>
  );
}
export function ClientSetup() {
  useEffect(() => {
    if (localStorage.getItem("ji-eum-theme") === "light")
      document.documentElement.classList.add("light");
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
export function ShareButton({
  title,
  disabled = false,
}: {
  title: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={async () => {
          try {
            if (navigator.share) {
              await navigator.share({ title, url: location.href });
              setStatus("공유를 완료했습니다.");
            } else {
              await navigator.clipboard.writeText(location.href);
              setStatus("링크를 복사했습니다.");
            }
          } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            setStatus("공유할 수 없습니다. 주소창의 링크를 복사해 주세요.");
          }
        }}
      >
        <Share2 size={16} />
        공유하기
      </Button>
      <span className="tiny" role="status">
        {status}
      </span>
    </div>
  );
}
export function SearchBox({ value = "" }: { value?: string }) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setRecent(
          JSON.parse(localStorage.getItem("ji-eum-searches") || "[]")
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 5),
        );
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div>
      <form
        action="/"
        className="search-box"
        onSubmit={(e) => {
          const query = String(
            new FormData(e.currentTarget).get("q") || "",
          ).trim();
          if (query)
            localStorage.setItem(
              "ji-eum-searches",
              JSON.stringify(
                [query, ...recent.filter((s) => s !== query)].slice(0, 5),
              ),
            );
        }}
      >
        <Search size={22} />
        <input
          aria-label="음악 검색"
          type="search"
          name="q"
          defaultValue={value}
          placeholder="어떤 음악이 궁금한가요?"
          maxLength={120}
        />
        <Button type="submit" variant="ghost" size="icon" aria-label="검색">
          <ArrowUpRight size={20} />
        </Button>
      </form>
      {recent.length > 0 && (
        <div className="recent-searches">
          <span>최근 검색</span>
          {recent.map((s) => (
            <Link key={s} href={`/?q=${encodeURIComponent(s)}`}>
              {s}
            </Link>
          ))}
          <button
            aria-label="최근 검색 지우기"
            onClick={() => {
              localStorage.removeItem("ji-eum-searches");
              setRecent([]);
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
