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

/* ── 두 레이어 내비게이션(2026-10) ──────────────────────────────────────────
   A. SpaceCube Platform — 공간을 찾고 내 취향을 만드는 기능: 공간 찾기 · 큐레이터 · 추천 · 내 아카이브
   B. SpaceCube Original — 공간큐브가 직접 만드는 영역: 스토리 · 큐레이션 · 함께한 공간 · Cube 경험(/spacecube 허브)
   플랫폼 기능(공간 찾기·큐레이터)이 보이는 사람에게는 상단을 플랫폼으로 채우고 Original은 하단 "공간큐브"로 모은다.
   아직 플랫폼 기능을 볼 수 없는 방문자에게는 기존 상단 구성을 그대로 둔다 — 준비되지 않은 메뉴를 먼저 공개하지 않는다.
   기존 경로(/story, /curation, /cube-spaces)는 그대로이고 어디서도 리다이렉트하지 않는다. ── */
const ORIGINAL_NAV_ITEMS = [
  { label: "스토리", href: "/story", match: (p: string) => p === "/story" || p.startsWith("/people") || p.startsWith("/thought") },
  { label: "큐레이션", href: "/curation", match: (p: string) => p.startsWith("/curation") },
  // 공개 공간 상세(/spaces/[slug])는 일반·파트너 공용이라 활성 표시하지 않는다. Cube 운영 라우트(/space/**)와도 분리.
  { label: "함께한 공간", href: "/cube-spaces", match: (p: string) => p.startsWith("/cube-spaces") },
];
const RECOMMEND_ITEM = { label: "추천", href: "/recommend", match: (p: string) => p.startsWith("/recommend") };
const PLATFORM_NAV_ITEMS = [
  { label: "공간 찾기", href: "/find", match: (p: string) => p.startsWith("/find") },
  { label: "큐레이터", href: "/curators", match: (p: string) => p.startsWith("/curators") || p.startsWith("/collections") },
  RECOMMEND_ITEM,
];
const EDITORIAL_NAV_ITEMS = [...ORIGINAL_NAV_ITEMS, RECOMMEND_ITEM];

interface Viewer {
  loggedIn: boolean;
  admin: boolean;
  editorial: boolean;
  /** 큐레이터 프로토타입 표시 여부(ENABLE_CURATOR_PROTOTYPE 또는 관리자·로컬 미리보기) */
  curators?: boolean;
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
          <Link href="/" aria-label="홈으로 이동" className="mr-auto p-2 -m-2 text-[13px] font-bold tracking-[0.14em] transition-opacity" style={{ color: "#fff", opacity: isHome ? 1 : 0.6 }}>
            {BRAND_NAME}
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

  // 플랫폼 기능을 볼 수 있으면 상단 = 플랫폼, 아니면 기존 구성(Original + 추천) 그대로.
  const platform = !!viewer?.curators;
  const navItems = platform ? PLATFORM_NAV_ITEMS : EDITORIAL_NAV_ITEMS;
  const accountHref = viewer?.loggedIn ? "/archive" : "/login";
  const accountActive = pathname.startsWith("/archive");
  const accountLabel = viewer?.loggedIn ? "내 아카이브" : "로그인";

  return (
    <nav className="sticky top-0 z-50 w-full" style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}>
      <div className="ed-container flex items-center h-14 gap-8">
        <Link href="/" aria-label="GONGGANCUBE 홈" className="mr-auto py-2 text-[13px] font-bold tracking-[0.14em]" style={{ color: "#fff" }}>
          {BRAND_NAME}
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navItems.map(({ label, href, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="text-[13px] tracking-[0.02em] whitespace-nowrap transition-opacity hover:opacity-100"
                style={{ color: "#fff", opacity: active ? 1 : 0.55, fontWeight: active ? 600 : 500 }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <Link href="/#participate" className="hidden lg:inline-block text-xs font-semibold px-3.5 py-2 whitespace-nowrap transition-colors hover:bg-white hover:text-black" style={{ color: "#fff", border: "1px solid #fff" }}>
            공간 제안하기
          </Link>
          {viewer && (
            <Link href={accountHref} className="text-[13px] whitespace-nowrap transition-opacity hover:opacity-100" style={{ color: "#fff", opacity: accountActive ? 1 : 0.55, fontWeight: accountActive ? 600 : 400 }}>
              {accountLabel}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="md:hidden -mr-3 w-12 h-12 flex items-center justify-center"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpenPath(menuOpen ? null : pathname)}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: "#fff" }} aria-hidden>
            {menuOpen ? (
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            ) : (
              <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col overflow-y-auto" style={{ background: "#000" }}>
          <ul className="px-5 pt-6">
            {[
              ...navItems,
              ...(viewer?.loggedIn ? [{ label: "내 아카이브", href: "/archive", match: (p: string) => p.startsWith("/archive") }] : []),
            ].map(({ label, href, match }) => (
              <li key={href} style={{ borderBottom: "1px solid #222" }}>
                <Link
                  href={href}
                  onClick={() => setMenuOpenPath(null)}
                  className="flex items-center justify-between py-5 text-2xl font-bold tracking-[-0.01em]"
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
            {/* 하단 보조 영역 — 계정 · 공간큐브(Original 허브) · 소개 · 관리자(관리자에게만) */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: "#999" }}>
              <Link href={accountHref} onClick={() => setMenuOpenPath(null)}>{accountLabel}</Link>
              <Link href="/spacecube" onClick={() => setMenuOpenPath(null)} style={{ color: "#fff" }}>공간큐브</Link>
              <Link href="/about" onClick={() => setMenuOpenPath(null)}>공간큐브 소개</Link>
              {viewer?.admin && <Link href="/admin" onClick={() => setMenuOpenPath(null)}>관리자</Link>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
