"use client";

import { useRef, useState } from "react";
import Link from "next/link";

/* 방문한 공간을 5개씩 묶어 가로로 넘겨보는 페이저.
   네이티브 scroll-snap 사용 — 모바일 스와이프가 기본, 데스크톱은 화살표/드래그 스크롤. */

const PAGE_SIZE = 5;

export interface VisitedRow {
  id: string; // Record id — /archive/[recordId]로 이동
  name: string;
  visitedAt: string; // 이미 포맷된 문자열
  tasteScore: number | null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function VisitedSpacesPager({ records }: { records: VisitedRow[] }) {
  const pages = chunk(records, PAGE_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  function scrollToPage(i: number) {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setPage(clamped);
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (pages.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory w-full"
        style={{ scrollbarWidth: "none" }}
      >
        {pages.map((group, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-start space-y-4">
            {group.map((r) => (
              <Link key={r.id} href={`/archive/${r.id}`} className="flex justify-between items-baseline group">
                <span className="text-sm font-medium group-hover:underline">{r.name}</span>
                <span className="text-xs flex-shrink-0 ml-4 flex items-center gap-2" style={{ color: "var(--dim)" }}>
                  {r.tasteScore != null && <span>{r.tasteScore}/5</span>}
                  {r.visitedAt}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{ width: i === page ? 16 : 6, background: i === page ? "var(--fg)" : "var(--border)" }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="이전 방문 묶음"
              onClick={() => scrollToPage(page - 1)}
              disabled={page === 0}
              className="w-8 h-8 border text-sm transition-colors disabled:opacity-25"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음 방문 묶음"
              onClick={() => scrollToPage(page + 1)}
              disabled={page === pages.length - 1}
              className="w-8 h-8 border text-sm transition-colors disabled:opacity-25"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
