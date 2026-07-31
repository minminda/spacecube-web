"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story") },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about") },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation") },
];

export default function Navbar() {
  const pathname = usePathname();

  // 운영자 화면(/admin, /operator)은 완전히 분리된 레이아웃·헤더를 쓰므로 일반 사용자 Navbar는
  // 아예 렌더링하지 않는다 — 운영 관리 진입 흔적이 일반 사용자 화면에 남지 않는다.
  if (pathname.startsWith("/admin") || pathname.startsWith("/operator")) return null;

  const isHome = pathname === "/";

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}
    >
      <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-8">
        <Link
          href="/"
          aria-label="홈으로 이동"
          className="mr-auto p-2 -m-2 flex items-center transition-opacity"
          style={{ opacity: isHome ? 1 : 0.5 }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: "#fff" }}>
            <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <polyline points="4,7.5 12,12 20,7.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
            <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </Link>

        {NAV_ITEMS.map(({ label, href, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-wide whitespace-nowrap transition-opacity hover:opacity-100"
              style={{
                color: "#fff",
                opacity: active ? 1 : 0.4,
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
