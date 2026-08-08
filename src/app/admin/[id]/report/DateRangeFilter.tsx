"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { presetDateRange, parseKstDateStart, type DateRangePreset } from "@/lib/reportDateRange";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "all", label: "전체" },
];

interface Props {
  from: string; // 현재 조회 중인 시작일("YYYY-MM-DD", KST)
  to: string;
  activePreset: DateRangePreset | null;
  /** 공간의 데이터 시작 시점("전체" 프리셋 계산용, "YYYY-MM-DD") */
  allTimeStart: string;
}

export default function DateRangeFilter({ from, to, activePreset, allTimeStart }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [error, setError] = useState<string | null>(null);

  function pushRange(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(preset: DateRangePreset) {
    const allTimeStartDate = parseKstDateStart(allTimeStart) ?? new Date();
    const range = presetDateRange(preset, new Date(), allTimeStartDate);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setError(null);
    pushRange(range.from, range.to);
  }

  function applyCustomRange() {
    if (!draftFrom || !draftTo) {
      setError("시작일과 종료일을 모두 선택해주세요.");
      return;
    }
    if (draftFrom > draftTo) {
      setError("시작일은 종료일보다 이후일 수 없습니다.");
      return;
    }
    setError(null);
    pushRange(draftFrom, draftTo);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => applyPreset(p.value)}
            className="text-xs px-3 py-1.5 border transition-colors"
            style={{
              borderColor: activePreset === p.value ? "var(--fg)" : "var(--border)",
              background: activePreset === p.value ? "var(--fg)" : "transparent",
              color: activePreset === p.value ? "var(--bg)" : "var(--dim)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={draftFrom}
          onChange={(e) => setDraftFrom(e.target.value)}
          className="text-xs px-2 py-1.5 border bg-transparent outline-none"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <span className="text-xs" style={{ color: "var(--dim)" }}>~</span>
        <input
          type="date"
          value={draftTo}
          onChange={(e) => setDraftTo(e.target.value)}
          className="text-xs px-2 py-1.5 border bg-transparent outline-none"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button
          type="button"
          onClick={applyCustomRange}
          className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
        >
          조회
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "#b0342a" }}>{error}</p>}
    </div>
  );
}
