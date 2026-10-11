"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface Props {
  id?: string;
  title: string;
  /** 제목 아래 한 줄 — 왜 이 공간들인지 */
  description?: string;
  href?: string;
  cta?: string;
  /** 카드 폭 종류(globals.css .ed-shelf-*) */
  kind: "space" | "story" | "curation" | "person";
  children: React.ReactNode;
}

/**
 * HOME 선반 — 제목(왜 이 공간들인가) + 가로 스크롤 카드 줄.
 * 휴대폰은 손가락으로 넘기고(화면 끝에서 다음 카드가 잘려 보인다), 데스크톱은 머리줄 오른쪽 ← → 로 한 화면씩.
 * 자동 넘김 · 무한 반복 · 순위 번호는 없다. 카드(<li>)는 서버에서 만들어 children으로 넘긴다.
 */
export default function Shelf({ id, title, description, href, cta = "전체 보기", kind, children }: Props) {
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
    <section id={id} className="scroll-mt-20 py-4 md:py-6" aria-label={title}>
      <div className="ed-wide">
        <div className="flex items-end justify-between gap-4 pb-2.5 md:pb-3.5">
          <div className="min-w-0">
            <h2 className="text-[22px] leading-snug md:text-[30px] font-bold tracking-[-0.025em] break-keep">{title}</h2>
            {description && <p className="pt-1 text-xs md:text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>{description}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-3">
            {href && (
              <Link href={href} className="inline-flex items-center min-h-10 text-sm md:text-base font-bold hover:underline underline-offset-4">
                {cta} <ChevronRightIcon className="w-4 h-4 ml-0.5" strokeWidth={2} />
              </Link>
            )}
            {scrollable && (
              <span className="hidden md:flex gap-1.5">
                {([-1, 1] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => page(dir)}
                    disabled={dir === -1 ? edge.start : edge.end}
                    aria-label={`${title} ${dir === -1 ? "이전" : "다음"} 보기`}
                    className="w-9 h-9 flex items-center justify-center border rounded-[var(--ed-radius)] transition-opacity disabled:opacity-25"
                    style={{ borderColor: "var(--ed-line)" }}
                  >
                    {dir === -1 ? <ChevronLeftIcon className="w-4 h-4" strokeWidth={2} /> : <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />}
                  </button>
                ))}
              </span>
            )}
          </div>
        </div>
        <ul ref={ref} className={`ed-shelf ed-shelf-${kind}`}>
          {children}
        </ul>
      </div>
    </section>
  );
}
