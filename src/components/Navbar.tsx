"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "공간들", href: "/discover", match: (p: string) => p === "/" || p.startsWith("/discover") || p.startsWith("/stories") || p.startsWith("/story") || p.startsWith("/space") },
  { label: "공간큐브", href: "/about", match: (p: string) => p.startsWith("/about") },
  { label: "추천 방식", href: "/recommendation", match: (p: string) => p.startsWith("/recommendation") },
];

const OPERATOR_NAV_ITEM = { label: "운영 관리", href: "/operator", match: (p: string) => p.startsWith("/operator") };

export default function Navbar() {
  const pathname = usePathname();
  // 루트 레이아웃에서 서버 인증을 확인하면 정적 페이지(about/recommendation 등)까지 전부
  // 강제로 동적 렌더링되므로, 클라이언트에서 마운트 후 가볍게 확인한다(약간의 지연 후 노출 — 허용 가능한 트레이드오프).
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.isOperator) setIsOperator(true); })
      .catch(() => {/* 조용히 무시 — 메뉴만 안 보일 뿐 기능에 영향 없음 */});
  }, []);

  const isOwner = pathname.startsWith("/owner");
  if (isOwner) return null;

  const navItems = isOperator ? [...NAV_ITEMS, OPERATOR_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: "#000", borderBottom: "1px solid #1a1a1a" }}
    >
      <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-8">
        <Link
          href="/"
          className="text-xs tracking-widest mr-auto transition-opacity"
          style={{ color: "#fff", opacity: 0.35 }}
        >
          ■
        </Link>

        {navItems.map(({ label, href, match }) => {
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
