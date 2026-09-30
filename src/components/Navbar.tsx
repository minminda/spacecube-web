"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENABLE_NAV_DISCOVER_LINK, ENABLE_NAV_RECOMMENDATION_LINK, ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { BRAND_NAME } from "@/content/site";

const LEGACY_NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story"), enabled: ENABLE_NAV_DISCOVER_LINK },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about"), enabled: true },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation"), enabled: ENABLE_NAV_RECOMMENDATION_LINK },
].filter((item) => item.enabled);

const EDITORIAL_NAV_ITEMS = [
  { label: "CURATION", href: "/curation", match: (p: string) => p.startsWith("/curation") },
  { label: "PEOPLE", href: "/people", match: (p: string) => p.startsWith("/people") },
  // 공개 SPACE는 /spaces — Cube 운영 라우트(/space/[slug]/**)와 분리돼 있어 거기서는 활성 표시하지 않는다.
  { label: "SPACE", href: "/spaces", match: (p: string) => p === "/spaces" || p.startsWith("/spaces/") },
  { label: "ABOUT", href: "/about", match: (p: string) => p.startsWith("/about") },
];

interface Viewer {
  loggedIn: boolean;
  admin: boolean;
  editorial: boolean;
}

// 페이지 이동마다 다시 묻지 않도록 탭 단위로 한 번만 조회한다(로그인/로그아웃은 전체 리로드를 동반).
let viewerPromise: Promise<Viewer | null> | null = null;
function fetchViewer(): Promise<Viewer | null> {
  if (!viewerPromise) {
    viewerPromise = fetch("/api/site/viewer", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Viewer>) : null))
      .catch(() => null);
  }
  return viewerPromise;
}

function CubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: "#fff" }} aria-hidden>
      <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <polyline points="4,7.5 12,12 20,7.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  // 모바일 메뉴는 "열었던 경로"를 기억해, 다른 페이지로 이동하면 자동으로 닫힌 상태가 된다.
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const menuOpen = menuOpenPath === pathname;

  const hiddenArea = pathname.startsWith("/admin") || pathname.startsWith("/operator");

  useEffect(() => {
    if (hiddenArea) return;
    let alive = true;
    fetchViewer().then((v) => { if (alive) setViewer(v); });
    return () => { alive = false; };
  }, [hiddenArea]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // 운영자 화면(/admin, /operator)은 완전히 분리된 레이아웃·헤더를 쓰므로 일반 사용자 Navbar는
  // 아예 렌더링하지 않는다 — 운영 관리 진입 흔적이 일반 사용자 화면에 남지 않는다.
  if (hiddenArea) return null;

  const editorial = ENABLE_EDITORIAL_HOME || !!viewer?.editorial;
  const isHome = pathname === "/";

  // 높이(h-14 = 56px)는 방명록 캔버스가 calc(100dvh - 3.5rem)으로 전제하고 있으므로 두 모드 모두 유지한다.
  if (!editorial) {
    return (
      <nav className="sticky top-0 z-50 w-full" style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}>
        <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-8">
          <Link href="/" aria-label="홈으로 이동" className="mr-auto p-2 -m-2 flex items-center transition-opacity" style={{ opacity: isHome ? 1 : 0.5 }}>
            <CubeMark className="w-4 h-4" />
          </Link>
          {LEGACY_NAV_ITEMS.map(({ label, href, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="text-xs tracking-wide whitespace-nowrap transition-opacity hover:opacity-100"
                style={{ color: "#fff", opacity: active ? 1 : 0.4, fontWeight: active ? 500 : 400 }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  const accountHref = viewer?.loggedIn ? "/archive" : "/login";
  const accountLabel = viewer?.loggedIn ? "내 아카이브" : "로그인";

  return (
    <nav className="sticky top-0 z-50 w-full" style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}>
      <div className="ed-container flex items-center h-14 gap-8">
        <Link href="/" aria-label="GONGGANCUBE 홈" className="mr-auto flex items-center gap-2.5 py-2">
          <CubeMark className="w-4 h-4" />
          <span className="text-[13px] font-bold tracking-[0.14em]" style={{ color: "#fff" }}>{BRAND_NAME}</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {EDITORIAL_NAV_ITEMS.map(({ label, href, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="text-xs tracking-[0.12em] whitespace-nowrap transition-opacity hover:opacity-100"
                style={{ color: "#fff", opacity: active ? 1 : 0.55, fontWeight: active ? 600 : 500 }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <Link href="/#participate" className="text-xs font-semibold px-3.5 py-2 whitespace-nowrap transition-colors hover:bg-white hover:text-black" style={{ color: "#fff", border: "1px solid #fff" }}>
            공간 제안하기
          </Link>
          {viewer && (
            <Link href={accountHref} className="text-xs whitespace-nowrap transition-opacity hover:opacity-100" style={{ color: "#fff", opacity: 0.55 }}>
              {accountLabel}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="md:hidden -mr-2 w-11 h-11 flex items-center justify-center"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpenPath(menuOpen ? null : pathname)}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ color: "#fff" }} aria-hidden>
            {menuOpen ? (
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M4 8 H20 M4 16 H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col overflow-y-auto" style={{ background: "#000" }}>
          <ul className="px-5 pt-6">
            {EDITORIAL_NAV_ITEMS.map(({ label, href, match }) => (
              <li key={href} style={{ borderBottom: "1px solid #222" }}>
                <Link
                  href={href}
                  onClick={() => setMenuOpenPath(null)}
                  className="flex items-center justify-between py-5 text-2xl font-bold tracking-[0.06em]"
                  style={{ color: "#fff", opacity: match(pathname) ? 1 : 0.85 }}
                >
                  {label}
                  <span aria-hidden className="text-base" style={{ color: "#666" }}>→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 pt-8 pb-10 mt-auto space-y-4" style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}>
            <Link
              href="/#participate"
              onClick={() => setMenuOpenPath(null)}
              className="tap-target flex items-center justify-center w-full text-sm font-semibold"
              style={{ background: "#fff", color: "#000" }}
            >
              공간 제안하기
            </Link>
            <div className="flex items-center justify-between text-sm" style={{ color: "#999" }}>
              <Link href={accountHref} onClick={() => setMenuOpenPath(null)}>{accountLabel}</Link>
              {viewer?.admin && <Link href="/admin" onClick={() => setMenuOpenPath(null)}>관리자</Link>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
