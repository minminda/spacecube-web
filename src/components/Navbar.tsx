"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENABLE_NAV_DISCOVER_LINK, ENABLE_NAV_RECOMMENDATION_LINK, ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { BRAND_NAME, PARTICIPATION } from "@/content/site";

const LEGACY_NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story"), enabled: ENABLE_NAV_DISCOVER_LINK },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about"), enabled: true },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation"), enabled: ENABLE_NAV_RECOMMENDATION_LINK },
].filter((item) => item.enabled);

/* ── 상단 내비게이션(2026-10 최종) ────────────────────────────────────────
   큐레이션 · 스토리(텍스트 링크) + [추천](검정) [내 아카이브](흰색) — 두 CTA는 서로 흑백 반전된 한 쌍.
   - 추천 = /find(지역만 고르면 내 취향 데이터로 정렬). /recommend는 /find로 이어진다.
   - LATEST는 홈 섹션 + /latest 피드일 뿐 상단 메뉴가 아니다.
   - 큐레이터(프로토타입)·함께한 공간·공간 제안하기는 상단에 두지 않는다(제안은 푸터·모바일 하단 보조 영역).
   - 홈은 콘텐츠(LATEST · CURATION · STORY) 중심 — 추천·아카이브는 홈 섹션이 아니라 여기의 핵심 Action이다. ── */
const EDITORIAL_NAV_ITEMS = [
  { label: "큐레이션", href: "/curation", match: (p: string) => p.startsWith("/curation") },
  { label: "스토리", href: "/story", match: (p: string) => p === "/story" || p.startsWith("/people") || p.startsWith("/thought") },
];
const RECOMMEND_HREF = "/find";
const isRecommendPath = (p: string) => p.startsWith("/find") || p.startsWith("/recommend");

// 두 CTA 공용 치수 — 예전 상단 "공간 제안하기" 버튼(text-xs · px-3.5 · py-2 · 1px 테두리 · 각진 모서리)을 그대로 쓴다.
// 추천은 검정 Navbar 위에서도 버튼으로 읽히도록 흰 1px 테두리만 최소로 둔다. 아카이브도 같은 두께의 흰 테두리라 높이가 같다.
// 휴대폰에서도 두 CTA는 상단 바에 그대로 보인다(메뉴를 열지 않고 바로 추천 · 아카이브) — 폭만 줄인다.
const CTA_CLASS = "inline-flex items-center justify-center h-9 md:h-auto md:min-w-[88px] text-xs font-semibold px-3 md:px-3.5 md:py-2 whitespace-nowrap transition-opacity hover:opacity-85";
const CTA_RECOMMEND = { background: "#000", color: "#fff", border: "1px solid #fff" } as const;
const CTA_ARCHIVE = { background: "#fff", color: "#000", border: "1px solid #fff" } as const;

interface Viewer {
  loggedIn: boolean;
  admin: boolean;
  editorial: boolean;
  /** 큐레이터 프로토타입 표시 여부(ENABLE_CURATOR_PROTOTYPE 또는 관리자·로컬 미리보기) — 상단 메뉴에는 쓰지 않는다 */
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

  const navItems = EDITORIAL_NAV_ITEMS;
  // 비로그인이면 기존 로그인 화면을 거쳐 아카이브로 돌아온다(새 인증 흐름 없음).
  const archiveHref = viewer && !viewer.loggedIn ? "/login?callbackUrl=%2Farchive" : "/archive";
  const archiveActive = pathname.startsWith("/archive");
  const suggestHref = PARTICIPATION[0].href;

  return (
    <nav className="sticky top-0 z-50 w-full" style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}>
      <div className="ed-container flex items-center h-14 gap-2 md:gap-8">
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

        <div className="flex items-center gap-1.5 md:gap-2">
          <Link href={RECOMMEND_HREF} aria-current={isRecommendPath(pathname) ? "page" : undefined} className={CTA_CLASS} style={CTA_RECOMMEND}>
            추천
          </Link>
          <Link href={archiveHref} aria-current={archiveActive ? "page" : undefined} className={CTA_CLASS} style={CTA_ARCHIVE}>
            내 아카이브
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden -mr-3 w-11 h-12 flex items-center justify-center"
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
            {navItems.map(({ label, href, match }) => (
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
            {/* 하단 보조 영역 — 공간큐브 · 소개 · 공간 제안하기 · 관리자(관리자에게만) */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: "#999" }}>
              <Link href="/spacecube" onClick={() => setMenuOpenPath(null)} style={{ color: "#fff" }}>공간큐브</Link>
              <Link href="/about" onClick={() => setMenuOpenPath(null)}>공간큐브 소개</Link>
              <a href={suggestHref}>공간 제안하기</a>
              {viewer?.admin && <Link href="/admin" onClick={() => setMenuOpenPath(null)}>관리자</Link>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
