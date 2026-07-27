"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "framer-motion";
import SpaceNoteCard, { type SpaceNoteCardData } from "./SpaceNoteCard";

/* ── 공간 노트 페이저 — 카드 한 장씩 좌우로 넘긴다 ───────────────────────────
   드래그 판정 공식은 RecommendationPlaylist.tsx에서 이미 검증된 값을 그대로 재사용한다
   (offset.x + velocity.x*0.18을 임계값과 비교) — 새로 튜닝하지 않는다. 다만 시각적으로는
   커버플로우가 아니라 카드 1장이 슬라이드로 교체되는 단순한 전환을 쓴다.
   접근성: prefers-reduced-motion이면 애니메이션 없이 즉시 전환한다. ── */

const SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
const SWIPE_THRESHOLD = 56;

interface Props {
  entries: SpaceNoteCardData[];
  initialIndex: number;
}

export default function SpaceNotePager({ entries, initialIndex }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1: 이전으로, 1: 다음으로
  const reduceMotion = useReducedMotion();
  const last = entries.length - 1;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === index) return;
    setDirection(clamped > index ? 1 : -1);
    setIndex(clamped);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (entries.length === 0) return null;

  function handleDragEnd(_e: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.18;
    if (power < -SWIPE_THRESHOLD) go(index + 1);
    else if (power > SWIPE_THRESHOLD) go(index - 1);
  }

  const variants: Variants = reduceMotion
    ? { enter: { opacity: 1, x: 0 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 0 } }
    : {
        enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 48 : -48 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -48 : 48 }),
      };

  return (
    <div className="space-y-4">
      <div className="relative w-full" style={{ height: "min(640px, 72vh)" }}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={entries[index].spaceId}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0 } : SPRING}
            drag={entries.length > 1 ? "x" : false}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            <SpaceNoteCard data={entries[index]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 공간"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="w-9 h-9 border text-sm transition-colors disabled:opacity-25"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          ‹
        </button>
        <span className="text-xs" style={{ color: "var(--dim)" }}>{index + 1} / {entries.length}</span>
        <button
          type="button"
          aria-label="다음 공간"
          onClick={() => go(index + 1)}
          disabled={index === last}
          className="w-9 h-9 border text-sm transition-colors disabled:opacity-25"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
