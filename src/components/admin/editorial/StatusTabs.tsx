import Link from "next/link";
import type { EditorialStatusValue } from "@/lib/editorial/types";

type Filter = EditorialStatusValue | "ALL";

/** 목록 상태 필터(전체 / 발행 / 초안 / 보관) — 링크 기반(?status=). */
export default function StatusTabs({ base, current, counts, q }: { base: string; current: Filter; counts: Record<Filter, number>; q?: string }) {
  const tabs: { key: Filter; label: string }[] = [
    { key: "ALL", label: "전체" },
    { key: "PUBLISHED", label: "발행" },
    { key: "DRAFT", label: "초안" },
    { key: "ARCHIVED", label: "보관" },
  ];
  return (
    <nav className="flex flex-wrap gap-1 mb-4">
      {tabs.map((t) => {
        const params = new URLSearchParams();
        if (t.key !== "ALL") params.set("status", t.key);
        if (q) params.set("q", q);
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={`${base}${params.size ? `?${params}` : ""}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px]"
            style={{ background: active ? "var(--a-fg)" : "transparent", color: active ? "#fff" : "var(--a-dim)", border: active ? "1px solid var(--a-fg)" : "1px solid var(--a-line)" }}
          >
            {t.label}
            <span className="tabular-nums text-[11px]" style={{ opacity: 0.7 }}>{counts[t.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function parseStatusFilter(raw: string | undefined): Filter {
  return raw === "PUBLISHED" || raw === "DRAFT" || raw === "ARCHIVED" ? raw : "ALL";
}
