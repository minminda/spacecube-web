"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface Props {
  title: string;
  /** 카드 폭 종류(globals.css .ed-rail-*) */
  kind: "story" | "space";
  children: React.ReactNode;
}

/**
 * 상세 화면의 보조 줄 — 작은 라벨 + 한 줄 가로 스크롤 카드(<li>는 서버에서 만들어 children으로).
 * 휴대폰은 손가락으로 넘기고(끝에서 다음 카드가 잘려 보인다), 데스크톱은 트랙패드 · 라벨 오른쪽 작은 ← →.
 * HOME 선반(Shelf)보다 작게 — 큰 제목 · 전체 보기 없음.
 */
export default function DetailRail({ title, kind, children }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const scrollable = !(edge.start && edge.end);

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-3 pb-2.5 min-h-7">
        <p className="ed-label" style={{ color: "var(--ed-dim)" }}>{title}</p>
        {scrollable && (
          <span className="hidden md:flex gap-1">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => page(dir)}
                disabled={dir === -1 ? edge.start : edge.end}
                aria-label={`${title} ${dir === -1 ? "이전" : "다음"} 보기`}
                className="w-7 h-7 flex items-center justify-center border rounded-[var(--ed-radius)] transition-opacity disabled:opacity-25"
                style={{ borderColor: "var(--ed-line)" }}
              >
                {dir === -1 ? <ChevronLeftIcon className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronRightIcon className="w-3.5 h-3.5" strokeWidth={2} />}
              </button>
            ))}
          </span>
        )}
      </div>
      <ul ref={ref} className={`ed-rail ed-rail-${kind}`}>
        {children}
      </ul>
    </section>
  );
}
