import Link from "next/link";

interface Tab {
  key: string;
  label: string;
  href: string;
}

/** 에디토리얼 목록 상단 필터 — 링크 기반(서버 렌더, 공유 가능한 URL). 얇은 밑줄로만 현재 탭을 표시한다. */
export default function TabLinks({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="ed-scroll-x overflow-x-auto">
      <ul className="flex gap-6 md:gap-8 whitespace-nowrap">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className="inline-flex items-center min-h-11 py-2 text-xs md:text-sm tracking-[0.12em] font-semibold transition-opacity"
                style={{ opacity: on ? 1 : 0.45, borderBottom: on ? "1.5px solid var(--ed-fg)" : "1.5px solid transparent" }}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
