"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";

/* ── 추천 플레이리스트 (Cover Flow 스타일) ──────────────────────
   추천 1위 = 중앙 메인 카드, 2위 = 오른쪽 뒤에서 살짝 미리보기.
   scale · opacity · blur · 미세 rotateY 로 depth 표현.
   좌우 드래그/스와이프 또는 ‹ › 버튼으로 다음 카드를 중앙으로.
   과한 3D 없이 minimal · premium · quiet.
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

const SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
const SWIPE_THRESHOLD = 56; // px (offset + velocity 보정 합산 기준)

interface Layout {
  x: number;
  scale: number;
  opacity: number;
  blur: number;
  z: number;
  rotateY: number;
  interactive: boolean;
}

/** 상대 위치 p(= i - index)에 따른 카드 배치값 */
function layoutFor(p: number, W: number): Layout {
  if (p === 0) return { x: W * 0.03, scale: 1, opacity: 1, blur: 0, z: 40, rotateY: 0, interactive: true };
  if (p === 1) return { x: W * 0.72, scale: 0.9, opacity: 0.6, blur: 2, z: 30, rotateY: -10, interactive: true };
  if (p === 2) return { x: W * 0.82, scale: 0.82, opacity: 0.22, blur: 3.5, z: 20, rotateY: -12, interactive: false };
  if (p < 0)  return { x: -W * 0.55, scale: 0.9, opacity: 0, blur: 4, z: 0, rotateY: 8, interactive: false };
  return { x: W * 0.88, scale: 0.8, opacity: 0, blur: 4, z: 10, rotateY: -12, interactive: false };
}

export default function RecommendationPlaylist({ cards }: { cards: PlaylistCard[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (cards.length === 0) return null;

  const cardWidth = width ? Math.round(width * 0.8) : 0;
  const last = cards.length - 1;

  function go(next: number) {
    setIndex((cur) => Math.max(0, Math.min(last, next)));
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.18;
    if (power < -SWIPE_THRESHOLD) go(index + 1);
    else if (power > SWIPE_THRESHOLD) go(index - 1);
    // 임계값 미달이면 animate 목표(현재 index)로 스프링 복귀
  }

  return (
    <div className="space-y-3">
      {/* 카드 무대 */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden h-[380px] md:h-[420px]"
        style={{ perspective: 1200 }}
      >
        {cards.map((card, i) => {
          const p = i - index;
          const L = layoutFor(p, width);
          const isMain = p === 0;

          return (
            <motion.div
              key={card.id}
              className="absolute top-0 left-0 h-full will-change-transform"
              style={{
                width: cardWidth || "80%",
                zIndex: L.z,
                pointerEvents: L.interactive ? "auto" : "none",
                cursor: isMain ? "grab" : "pointer",
                transformStyle: "preserve-3d",
              }}
              initial={false}
              animate={{
                x: L.x,
                scale: L.scale,
                opacity: L.opacity,
                rotateY: L.rotateY,
                filter: `blur(${L.blur}px)`,
              }}
              transition={SPRING}
              drag={isMain && cards.length > 1 ? "x" : false}
              dragMomentum={false}
              whileDrag={{ cursor: "grabbing" }}
              onDragEnd={isMain ? handleDragEnd : undefined}
              onClick={() => {
                if (isMain) router.push(`/space/${card.slug}`);
                else if (p > 0) go(i); // 옆 카드 탭 → 중앙으로
              }}
            >
              <Card card={card} dimmed={!isMain} />
            </motion.div>
          );
        })}
      </div>

      {/* 컨트롤: 카운터 + 이전/다음 */}
      {cards.length > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {cards.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === index ? 16 : 6,
                  background: i === index ? "var(--fg)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="이전 공간"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="w-8 h-8 border text-sm transition-colors disabled:opacity-25"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음 공간"
              onClick={() => go(index + 1)}
              disabled={index === last}
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

function Card({ card, dimmed }: { card: PlaylistCard; dimmed: boolean }) {
  return (
    <div
      className="h-full flex flex-col border select-none overflow-hidden"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg)",
        boxShadow: dimmed ? "none" : "0 8px 30px rgba(0,0,0,0.08)",
      }}
    >
      {/* 이미지 */}
      <div className="relative flex-1 overflow-hidden" style={{ background: "var(--tag-bg)" }}>
        {card.imageUrl && (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            draggable={false}
            className="object-cover pointer-events-none"
            sizes="(max-width: 768px) 80vw, 480px"
          />
        )}
      </div>

      {/* 정보 */}
      <div className="p-4 space-y-2.5">
        <div className="space-y-0.5">
          <p className="text-base font-semibold leading-snug">{card.name}</p>
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

        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          {card.reason}
        </p>
      </div>
    </div>
  );
}
