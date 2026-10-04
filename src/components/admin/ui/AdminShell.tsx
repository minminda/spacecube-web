"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import CubeGlyph from "@/components/CubeGlyph";
import { ADMIN_NAV, activeAdminNavKey, adminBackFallback } from "@/lib/adminNav";

/* ── 관리자 작업실 셸 ─────────────────────────────────────────────────────
   Desktop(≥1024px): 고정 사이드바. Tablet/Mobile: 상단바 + 드로어 내비게이션.
   사이드바·상단바는 .no-print — 스티커 인쇄/리포트 PDF에는 나오지 않는다(globals.css의 print 규칙). */

interface Props {
  email: string | null;
  children: React.ReactNode;
}

/** 편집기 + 실시간 미리보기 화면(새 글 · 편집) */
const WIDE_EDITOR_RE = /^\/admin\/content\/(curations|people|thoughts)\/[^/]+$/;

export default function AdminShell({ email, children }: Props) {
  const pathname = usePathname();
  const activeKey = activeAdminNavKey(pathname);
  // 드로어는 "열었던 경로"를 기억해, 다른 페이지로 이동하면 자동으로 닫힌다.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const back = useAdminBack(pathname);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  return (
    <div className="admin-ui admin-bleed">
      {/* Desktop sidebar */}
      <aside
        className="no-print hidden lg:flex fixed inset-y-0 left-0 z-40 w-[232px] flex-col"
        style={{ background: "var(--a-soft)", borderRight: "1px solid var(--a-line)" }}
      >
        <SidebarBody activeKey={activeKey} email={email} />
      </aside>

      {/* Tablet / Mobile topbar */}
      <header
        className="no-print lg:hidden sticky top-0 z-40 flex items-center h-14 px-4 gap-3"
        style={{ background: "var(--a-bg)", borderBottom: "1px solid var(--a-line)" }}
      >
        <button
          type="button"
          aria-label={drawerOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerPath(drawerOpen ? null : pathname)}
          className="w-10 h-10 -ml-2 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
            {drawerOpen ? (
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <Brand />
        {back && <div className="ml-auto -mr-2">{back}</div>}
      </header>

      {drawerOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[272px] max-w-[85vw] h-full flex flex-col" style={{ background: "var(--a-soft)", borderRight: "1px solid var(--a-line)" }}>
            <SidebarBody activeKey={activeKey} email={email} onNavigate={() => setDrawerPath(null)} />
          </div>
          <button type="button" aria-label="메뉴 닫기" className="flex-1 h-full" style={{ background: "rgba(0,0,0,0.25)" }} onClick={() => setDrawerPath(null)} />
        </div>
      )}

      <div className="admin-main lg:pl-[232px]">
        {/* STORY·CURATION 편집 화면은 편집기 + 실시간 미리보기를 나란히 두므로 더 넓게 쓴다 */}
        <div className={`admin-content relative ${WIDE_EDITOR_RE.test(pathname) ? "max-w-[1760px]" : "max-w-[1120px]"} mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10`}>
          {/* 데스크톱: 본문 위 여백(40px) 오른쪽 위 — 페이지 제목·버튼과 겹치지 않는다 */}
          {back && <div className="no-print hidden lg:block absolute right-8 top-1">{back}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 뒤로가기(모든 관리자 화면, /admin 제외) — 관리자 안에서 이동해 온 화면이면 router.back(),
 * 주소로 바로 들어와 이전 화면이 없으면 상위 화면(adminBackFallback)으로. 셸이 페이지 이동 사이에 유지되므로
 * 관리자 안에서 지나온 경로를 직접 쌓아 판단한다(브라우저 history.length는 사이트 밖 기록까지 세어 쓸 수 없다).
 */
function useAdminBack(pathname: string): React.ReactNode {
  const router = useRouter();
  const trail = useRef<string[]>([]);
  useEffect(() => {
    const t = trail.current;
    if (t[t.length - 1] === pathname) return;
    if (t[t.length - 2] === pathname) t.pop(); // 뒤로 간 경우
    else t.push(pathname);
  }, [pathname]);
  const fallback = adminBackFallback(pathname);
  if (!fallback) return null;
  const goBack = () => {
    const t = trail.current;
    if (t.length > 1 && t[t.length - 1] === pathname) router.back();
    else router.push(fallback);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="뒤로가기"
      title="뒤로가기"
      className="w-10 h-10 inline-flex items-center justify-center rounded-md hover:bg-[#f2f2f2]"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
        <path d="M19 12H5 M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <CubeGlyph outlineWidth={1.4} edgeWidth={1.2} />
      </svg>
      <span className="text-[13px] font-bold tracking-[0.12em]">GONGGANCUBE</span>
      <span className="text-[11px] font-medium tracking-[0.12em]" style={{ color: "var(--a-dim)" }}>ADMIN</span>
    </Link>
  );
}

function SidebarBody({ activeKey, email, onNavigate }: { activeKey: string | null; email: string | null; onNavigate?: () => void }) {
  return (
    <>
      <div className="h-14 flex items-center px-5 shrink-0">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {ADMIN_NAV.map((group) => (
          <div key={group.area} className="pt-5 first:pt-2">
            <div className="px-2 pb-1.5 flex items-baseline justify-between gap-2">
              <p className="a-eyebrow" style={{ fontSize: 10 }}>{group.label}</p>
              {group.caption && <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>{group.caption}</p>}
            </div>
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = item.key === activeKey;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center h-8 rounded-md text-[13px] transition-colors ${item.sub ? "pl-6 pr-2" : "px-2"}`}
                      style={{
                        background: active ? "var(--a-bg)" : "transparent",
                        color: active ? "var(--a-fg)" : item.sub ? "var(--a-dim)" : "#333",
                        fontWeight: active ? 600 : 400,
                        boxShadow: active ? "inset 0 0 0 1px var(--a-line)" : undefined,
                      }}
                    >
                      {item.sub && <span aria-hidden className="mr-1.5" style={{ color: "var(--a-faint)" }}>└</span>}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 px-5 py-4 space-y-2" style={{ borderTop: "1px solid var(--a-line)" }}>
        {email && <p className="text-xs truncate" style={{ color: "var(--a-dim)" }} title={email}>{email}</p>}
        <div className="flex items-center justify-between text-xs">
          <Link href="/" onClick={onNavigate} className="hover:underline underline-offset-4" style={{ color: "var(--a-dim)" }}>사이트 보기 ↗</Link>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="hover:underline underline-offset-4" style={{ color: "var(--a-dim)" }}>
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
}
