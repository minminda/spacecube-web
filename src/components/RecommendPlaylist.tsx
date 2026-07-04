"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ── 추천 플레이리스트 카드 UX ─────────────────────────────────
   음악 플레이리스트처럼 좌우로 넘기며 공간을 하나씩 발견하는 흐름.
   - 메인 카드 1개 중심, 다음 카드가 오른쪽에 ~20% 살짝 보임
   - 모바일: 가로 스와이프 (CSS scroll-snap)
   - 데스크톱: ‹ › 버튼
──────────────────────────────────────────────────────────── */

export interface PlaylistCard {
  id: string;
  slug: string;
  name: string;
  district: string | null;
  imageUrl: string | null;
  tagLabels: string[]; // 공간 취향 태그 2~3개 (한국어 레이블)
  reason: string; // 추천 이유 한 줄
}

export default function RecommendPlaylist({ cards }: { cards: PlaylistCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (cards.length === 0) return null;

  function cardStep(el: HTMLDivElement): number {
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return el.clientWidth;
    return first.offsetWidth + 16; // gap-4
  }

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / cardStep(el));
    setIndex(Math.max(0, Math.min(cards.length - 1, i)));
  }

  function scrollTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(cards.length - 1, i));
    el.scrollTo({ left: next * cardStep(el), behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      {/* 컨트롤: 카운터 + 이전/다음 */}
      <div className="flex items-center justify-between">
        <p className="text-xs tabular-nums" style={{ color: "var(--border)" }}>
          {index + 1} / {cards.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="이전 공간"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            className="w-8 h-8 border text-sm transition-colors disabled:opacity-25"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 공간"
            onClick={() => scrollTo(index + 1)}
            disabled={index === cards.length - 1}
            className="w-8 h-8 border text-sm transition-colors disabled:opacity-25"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            ›
          </button>
        </div>
      </div>

      {/* 카드 트랙 — 다음 카드가 오른쪽에 살짝 보이게 */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 pb-1"
        style={{ scrollbarWidth: "none", scrollPaddingLeft: 24 }}
      >
        {cards.map((card) => (
          <Link
            key={card.id}
            href={`/space/${card.slug}`}
            className="flex-shrink-0 w-[78%] md:w-[55%] snap-start group"
          >
            <div className="border h-full flex flex-col" style={{ borderColor: "var(--border)" }}>
              {card.imageUrl ? (
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-full" style={{ aspectRatio: "16 / 10", background: "var(--tag-bg)" }} />
              )}

              <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                <div className="space-y-0.5">
                  <p className="text-base font-semibold leading-snug group-hover:underline">{card.name}</p>
                  {card.district && (
                    <p className="text-xs" style={{ color: "var(--dim)" }}>{card.district}</p>
                  )}
                </div>

                {card.tagLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.tagLabels.map((label) => (
                      <span
                        key={label}
                        className="text-xs px-2 py-0.5 border"
                        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--dim)" }}>
                  {card.reason}
                </p>

                <p className="text-xs pt-1" style={{ color: "var(--dim)" }}>공간 보기 →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
