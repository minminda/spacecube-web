"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SpaceTab {
  href: string;
  label: string;
  /** 이 prefix로 시작하면 활성 */
  match: string;
}

/** 운영 공간 상세 공통 탭 — 기존 /admin/[id]/* 라우트를 그대로 연결만 한다. */
export default function SpaceTabs({ tabs }: { tabs: SpaceTab[] }) {
  const pathname = usePathname();
  return (
    <nav className="no-print -mx-4 md:mx-0 px-4 md:px-0 overflow-x-auto ed-scroll-x" style={{ borderBottom: "1px solid var(--a-line)" }}>
      <ul className="flex gap-1 min-w-max">
        {tabs.map((t) => {
          const active = pathname === t.match || pathname.startsWith(`${t.match}/`);
          return (
            <li key={`${t.href}-${t.label}`}>
              <Link
                href={t.href}
                className="relative inline-flex items-center h-10 px-3 text-[13px] whitespace-nowrap transition-colors"
                style={{ color: active ? "var(--a-fg)" : "var(--a-dim)", fontWeight: active ? 600 : 400 }}
              >
                {t.label}
                {active && <span aria-hidden className="absolute left-3 right-3 -bottom-px h-[2px]" style={{ background: "var(--a-fg)" }} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
