"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 아카이브는 기록에 집중한다 — 취향 기반 추천은 별도 페이지(/recommend)로 분리됐다(2026-10).
const TABS = [
  { href: "/archive", label: "내 아카이브" },
  { href: "/archive/all", label: "다녀온 공간" },
  { href: "/archive/saved", label: "저장한 공간" },
] as const;

/** 아카이브 섹션을 오가는 하단 탭 — 각 탭 페이지가 직접 렌더링한다(공유 layout 아님),
 *  /archive/[recordId]·/archive/space/[spaceId] 같은 드릴다운 페이지엔 노출하지 않기 위함. */
export default function ArchiveBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex mt-10 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
      {TABS.map((tab) => {
        const active = tab.href === "/archive" ? pathname === "/archive" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 text-center py-2 text-xs transition-colors"
            style={{ color: active ? "var(--fg)" : "var(--dim)", fontWeight: active ? 600 : 400 }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
