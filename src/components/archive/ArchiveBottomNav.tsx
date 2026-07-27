"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/archive", label: "공간 노트" },
  { href: "/archive/taste", label: "내 취향" },
  { href: "/archive/saved", label: "저장한 공간" },
  { href: "/archive/all", label: "전체 기록" },
] as const;

/** 아카이브 4개 섹션을 오가는 하단 탭 — 각 탭 페이지가 직접 렌더링한다(공유 layout 아님),
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
