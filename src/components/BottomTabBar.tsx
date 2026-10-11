"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { useSiteViewer } from "@/lib/client/useSiteViewer";
import { BookmarkIcon, HomeIcon, SearchIcon } from "@/components/icons";

/* ── 모바일 하단 탭 — 홈 · 검색 · 내 공간 ──────────────────────────────────────
   휴대폰(md 미만)에서만 보이는 고정 탭. 서비스의 최상위 구조 세 가지를 앱처럼 한 손으로 오간다.
   - 아이콘은 벡터(이모지 없음) + 글자. 현재 탭은 글자 · 아이콘이 진해지고(굵게) 위쪽에 짧은 선이 붙는다. 색은 흑백뿐.
   - iPhone 홈 인디케이터 영역(safe-area)만큼 아래를 띄우고, 같은 높이의 빈 칸(spacer)을 문서 끝에 두어 푸터가 가려지지 않게 한다.
   - 비로그인도 쓸 수 있다: "내 공간"은 기존 로그인 화면(callbackUrl=/archive)을 거쳐 돌아온다.
   - Cube(QR 현장) 경험 · 로그인 · 관리자 화면에는 두지 않는다 — 현장 화면의 하단 조작과 겹치지 않게. ── */

const HIDDEN_PREFIXES = ["/admin", "/operator", "/space/", "/c/", "/login", "/preview", "/api"];

const isActive = {
  home: (p: string) => p === "/",
  search: (p: string) => p.startsWith("/search") || p.startsWith("/find") || p.startsWith("/recommend"),
  my: (p: string) => p.startsWith("/archive") || p.startsWith("/settings"),
};

export default function BottomTabBar() {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const viewer = useSiteViewer(!hidden);
  const editorial = ENABLE_EDITORIAL_HOME || !!viewer?.editorial;
  if (hidden || !editorial) return null;

  const myHref = viewer && !viewer.loggedIn ? "/login?callbackUrl=%2Farchive" : "/archive";
  const tabs = [
    { key: "home", label: "홈", href: "/", active: isActive.home(pathname), icon: HomeIcon },
    { key: "search", label: "검색", href: "/search", active: isActive.search(pathname), icon: SearchIcon },
    { key: "my", label: "내 공간", href: myHref, active: isActive.my(pathname), icon: BookmarkIcon },
  ] as const;

  return (
    <>
      <nav
        aria-label="주요 메뉴"
        className="ed-chrome md:hidden fixed inset-x-0 bottom-0 z-40"
        style={{ background: "var(--ed-bg)", color: "var(--ed-fg)", borderTop: "1px solid var(--ed-line)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-3">
          {tabs.map(({ key, label, href, active, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center justify-center gap-1 w-full"
                style={{ height: "var(--tab-h)", color: active ? "var(--ed-fg)" : "var(--ed-dim)", fontWeight: active ? 700 : 500 }}
              >
                {active && <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px]" style={{ background: "var(--ed-fg)" }} />}
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.1 : 1.6} />
                <span className="text-[11px] leading-none">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* 문서 끝의 빈 칸 — 탭 바가 푸터 · 마지막 콘텐츠를 가리지 않게 */}
      <div aria-hidden className="md:hidden" style={{ height: "calc(var(--tab-h) + env(safe-area-inset-bottom))" }} />
    </>
  );
}
