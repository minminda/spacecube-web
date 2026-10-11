"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ENABLE_NAV_DISCOVER_LINK, ENABLE_NAV_RECOMMENDATION_LINK, ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { BRAND_NAME, CONTACT_EMAIL, INSTAGRAM_URL, PARTICIPATION } from "@/content/site";
import { useSiteViewer } from "@/lib/client/useSiteViewer";
import { ChevronRightIcon, CloseIcon, LogInIcon, LogOutIcon, MenuIcon, SearchIcon } from "@/components/icons";
// 모든 화면에 있는 Navbar에서 이동 종류(링크/뒤로가기) 감지를 미리 켠다 — 목록에서 상세로 처음 들어갈 때도 동작하도록
import "@/components/editorial/useArticleScroll";

const LEGACY_NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story"), enabled: ENABLE_NAV_DISCOVER_LINK },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about"), enabled: true },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation"), enabled: ENABLE_NAV_RECOMMENDATION_LINK },
].filter((item) => item.enabled);

/* ── 상단 내비게이션(2026-10 개편) ─────────────────────────────────────────
   서비스의 최상위는 HOME · 검색 · 내 공간 셋뿐이다. 추천은 별도 목적지가 아니라 HOME을 개인화하는 원리라 메뉴에서 뺐다.
   - 데스크톱 · 모바일 모두 [로고 ···  (검색) ☰] — 메뉴는 ☰ 하나로 통일. 데스크톱은 오른쪽에서 열리는 패널, 모바일은 전체 화면.
     데스크톱 상단 바는 모바일(56px)보다 조금 두껍다(68px, --nav-h). 모바일은 하단 탭(홈 · 검색 · 내 공간)이 있어 상단에 검색을 두지 않는다.
   - 메뉴 구성: 콘텐츠(CURATION · STORY) / 탐색(지역 · 테마 둘러보기) / 사용자(내 공간 · 설정) + 로그인 · 로그아웃, 아래에 보조 링크.
   - 큐레이터(프로토타입)·함께한 공간은 상단에 두지 않는다(HOME 선반에서 만난다). 공간 제안하기는 메뉴 하단 보조 영역 · 푸터. ── */

const CONTENT_ROWS = [
  { label: "CURATION", href: "/curation", match: (p: string) => p.startsWith("/curation") },
  { label: "STORY", href: "/story", match: (p: string) => p === "/story" || p.startsWith("/people") || p.startsWith("/thought") },
];
// 지역 · 테마 둘러보기는 검색 첫 화면의 "추천 지역" · "추천 테마" 구획으로 간다(검색어 없이 열었을 때 보이는 입구).
const EXPLORE_ROWS = [
  { label: "지역 둘러보기", href: "/search#regions" },
  { label: "테마 둘러보기", href: "/search#themes" },
];

const isSearchPath = (p: string) => p.startsWith("/search") || p.startsWith("/find") || p.startsWith("/recommend");

export default function Navbar() {
  const pathname = usePathname();
  // 메뉴는 "열었던 경로"를 기억해, 다른 페이지로 이동하면 자동으로 닫힌 상태가 된다.
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuOpen = menuOpenPath === pathname;

  const hiddenArea = pathname.startsWith("/admin") || pathname.startsWith("/operator");
  const viewer = useSiteViewer(!hiddenArea);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // 운영자 화면(/admin, /operator)은 완전히 분리된 레이아웃·헤더를 쓰므로 일반 사용자 Navbar는
  // 아예 렌더링하지 않는다 — 운영 관리 진입 흔적이 일반 사용자 화면에 남지 않는다.
  if (hiddenArea) return null;

  const editorial = ENABLE_EDITORIAL_HOME || !!viewer?.editorial;
  const isHome = pathname === "/";

  // 높이는 --nav-h(모바일 56px / 데스크톱 68px). 방명록 캔버스도 같은 값을 쓴다.
  if (!editorial) {
    return (
      <nav className="sticky top-0 z-50 w-full" style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}>
        <div className="max-w-2xl mx-auto px-6 flex items-center gap-8" style={{ height: "var(--nav-h)" }}>
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

  const close = () => setMenuOpenPath(null);
  // 비로그인이면 기존 로그인 화면을 거쳐 내 공간으로 돌아온다(새 인증 흐름 없음).
  const myHref = viewer && !viewer.loggedIn ? "/login?callbackUrl=%2Farchive" : "/archive";
  const suggestHref = PARTICIPATION[0].href;
  // 로그인 후 지금 보던 화면으로 돌아온다(기존 로그인 화면 그대로)
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname || "/")}`;
  // 로그인 화면에서는 숨긴다 — 그 화면의 callbackUrl(방명록 · 내 공간 등 돌아갈 곳)을 /login으로 덮어쓰지 않게
  const showLogin = !!viewer && !viewer.loggedIn && !pathname.startsWith("/login");

  const row = (label: string, href: string, active: boolean) => (
    <li key={label} style={{ borderBottom: "1px solid #232323" }}>
      <Link
        href={href}
        onClick={close}
        aria-current={active ? "page" : undefined}
        className="flex items-center justify-between min-h-14 md:min-h-12 py-2 text-[20px] md:text-[17px] font-semibold tracking-[-0.01em]"
        style={{ color: "#fff", opacity: active ? 1 : 0.88 }}
      >
        {label}
        <ChevronRightIcon className="w-5 h-5 shrink-0" strokeWidth={1.6} />
      </Link>
    </li>
  );
  const groupLabel = (text: string) => (
    <p className="px-0 pt-6 pb-1 text-[11px] font-semibold tracking-[0.14em]" style={{ color: "#8a8a8a" }}>{text}</p>
  );

  return (
    <nav className="ed-chrome sticky top-0 z-50 w-full" style={{ background: "var(--ed-chrome)", borderBottom: "1px solid var(--ed-chrome-line)" }}>
      <div className="ed-wide flex items-center gap-1" style={{ height: "var(--nav-h)" }}>
        <Link href="/" aria-label="GONGGANCUBE 홈" className="mr-auto py-2 text-[13px] md:text-[16px] font-bold tracking-[0.14em]" style={{ color: "#fff" }}>
          {BRAND_NAME}
        </Link>

        {/* 데스크톱의 검색 진입 — 모바일은 하단 탭에 검색이 있어 두지 않는다 */}
        <Link
          href="/search"
          aria-label="검색"
          aria-current={isSearchPath(pathname) ? "page" : undefined}
          className="hidden md:flex w-12 h-12 items-center justify-center transition-opacity hover:opacity-100"
          style={{ color: "#fff", opacity: isSearchPath(pathname) ? 1 : 0.8 }}
        >
          <SearchIcon className="w-[22px] h-[22px]" />
        </Link>

        <button
          type="button"
          className="-mr-3 md:-mr-3 w-12 h-12 flex items-center justify-center transition-opacity hover:opacity-100"
          style={{ color: "#fff", opacity: menuOpen ? 1 : 0.9 }}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpenPath(menuOpen ? null : pathname)}
        >
          {menuOpen ? <CloseIcon className="w-6 h-6" strokeWidth={1.5} /> : <MenuIcon className="w-6 h-6" strokeWidth={1.5} />}
        </button>
      </div>

      {menuOpen && (
        <>
          {/* 데스크톱: 패널 바깥을 누르면 닫힌다(모바일은 메뉴가 화면 전체) */}
          <button
            type="button"
            aria-label="메뉴 닫기"
            tabIndex={-1}
            onClick={close}
            className="hidden md:block fixed inset-x-0 bottom-0 z-40 cursor-default"
            style={{ top: "var(--nav-h)", background: "rgba(0,0,0,0.4)" }}
          />
          <div
            id="site-menu"
            role="dialog"
            aria-label="메뉴"
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-y-auto md:left-auto md:w-[400px]"
            style={{ top: "var(--nav-h)", background: "var(--ed-chrome)", borderLeft: "1px solid var(--ed-chrome-line)", overscrollBehavior: "contain" }}
          >
            <div className="px-5 md:px-7 pb-2">
              {groupLabel("콘텐츠")}
              <ul>{CONTENT_ROWS.map((r) => row(r.label, r.href, r.match(pathname)))}</ul>
              {groupLabel("탐색")}
              <ul>{EXPLORE_ROWS.map((r) => row(r.label, r.href, false))}</ul>
              {groupLabel("사용자")}
              <ul>
                {row("내 공간", myHref, pathname.startsWith("/archive"))}
                {row("설정", "/settings", pathname.startsWith("/settings"))}
              </ul>
            </div>

            {/* 계정 — 로그인 · 로그아웃은 기존 흐름 그대로(/login, next-auth signOut) */}
            <div className="px-5 md:px-7 pt-5">
              {showLogin && (
                <Link
                  href={loginHref}
                  onClick={close}
                  className="flex items-center justify-center gap-2 w-full h-12 text-base font-semibold"
                  style={{ background: "#fff", color: "#000" }}
                >
                  <LogInIcon className="w-5 h-5" />
                  로그인
                </Link>
              )}
              {viewer?.loggedIn && (
                <button
                  type="button"
                  onClick={() => { if (!signingOut) { setSigningOut(true); signOut({ callbackUrl: "/" }); } }}
                  disabled={signingOut}
                  className="flex items-center justify-center gap-2 w-full h-12 text-[15px] font-semibold disabled:opacity-60"
                  style={{ border: "1px solid #444", color: "#bbb" }}
                >
                  <LogOutIcon className="w-5 h-5" />
                  {signingOut ? "로그아웃 중..." : "로그아웃"}
                </button>
              )}
            </div>

            {/* 보조 — 작은 글자 */}
            <ul
              className="px-5 md:px-7 pt-8 mt-auto space-y-1 text-sm"
              style={{ color: "#999", paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
            >
              <li><Link href="/spacecube" onClick={close} className="inline-flex items-center min-h-10" style={{ color: "#fff" }}>공간큐브</Link></li>
              <li><Link href="/about" onClick={close} className="inline-flex items-center min-h-10">공간큐브 소개</Link></li>
              <li><a href={suggestHref} className="inline-flex items-center min-h-10">공간 제안하기</a></li>
              <li className="flex gap-6">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-10">Instagram ↗</a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center min-h-10">Contact</a>
              </li>
              {viewer?.admin && <li><Link href="/admin" onClick={close} className="inline-flex items-center min-h-10">관리자</Link></li>}
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
