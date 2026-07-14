"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RewardSummary } from "@/lib/guestbookReward";

/* ── 방명록 캔버스를 "다음으로"로 나갈 때 보여주는 완료 시퀀스 ──────────
   취향 저장(또는 흔적 남김) → 취향 업데이트 → 추천 공간 → 다음 Episode 예고
   순서로 조용히 한 장씩 넘어간다. 내용이 없는 단계는 건너뛴다.
   추천은 방명록 작성 여부와 무관하게 항상 제공된다 — 첫 단계 문구만 갈린다. ──────*/

interface Props {
  summary: RewardSummary;
  /** 이번 방문에서 포스트잇을 남겼는지 — 첫 단계 문구만 여기에 따라 갈린다 */
  wroteThisVisit: boolean;
  onClose: () => void;
}

type StepKey = "saved" | "taste" | "recommend" | "nextEpisode";

export default function VisitCompletionReward({ summary, wroteThisVisit, onClose }: Props) {
  const steps: StepKey[] = [
    "saved",
    ...(summary.topTags.length > 0 ? (["taste"] as const) : []),
    ...(summary.recommendations.length > 0 ? (["recommend"] as const) : []),
    ...(summary.nextEpisode ? (["nextEpisode"] as const) : []),
  ];
  const [i, setI] = useState(0);
  const key = steps[i];
  const isLast = i === steps.length - 1;

  function next() {
    if (isLast) onClose();
    else setI((v) => v + 1);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full sm:max-w-sm p-7"
          style={{ background: "#111", border: "1px solid #2a2a2a" }}
        >
          {key === "saved" && (
            <div className="py-6 text-center space-y-2.5">
              {wroteThisVisit ? (
                <>
                  <p className="text-base leading-relaxed" style={{ color: "#eee" }}>
                    당신의 흔적이
                    <br />이 공간에 남았습니다.
                  </p>
                  <p className="text-xs" style={{ color: "#999" }}>
                    이 공간의 {summary.postitCount}번째 흔적이 되었습니다.
                  </p>
                </>
              ) : (
                <p className="text-base leading-relaxed" style={{ color: "#eee" }}>
                  이번 방문의
                  <br />취향을 저장했습니다.
                </p>
              )}
            </div>
          )}

          {key === "taste" && (
            <div className="py-3 space-y-4">
              <p className="text-xs uppercase tracking-widest" style={{ color: "#999" }}>취향 업데이트</p>
              <div className="flex flex-wrap gap-2">
                {summary.topTags.map((t) => (
                  <span key={t.label} className="text-sm px-3 py-1.5 border" style={{ borderColor: "#3a3a3a", color: "#eee" }}>
                    {t.label} <span style={{ color: "#7dd3fc" }}>▲</span>
                  </span>
                ))}
              </div>
              {summary.tasteHighlight && (
                <p className="text-xs leading-relaxed" style={{ color: "#999" }}>{summary.tasteHighlight}</p>
              )}
            </div>
          )}

          {key === "recommend" && (
            <div className="py-2 space-y-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "#999" }}>당신과 잘 맞을 다음 공간</p>
              {summary.recommendationReason && (
                <p className="text-xs leading-relaxed" style={{ color: "#999" }}>{summary.recommendationReason}</p>
              )}
              <div className="pt-1">
                {summary.recommendations.map((r) => (
                  <Link
                    key={r.id}
                    href={`/space/${r.slug}`}
                    className="flex items-center justify-between py-2.5 transition-colors hover:opacity-70"
                    style={{ borderTop: "1px solid #262626" }}
                  >
                    <span className="text-sm truncate" style={{ color: "#eee" }}>{r.name}</span>
                    <span className="text-xs flex-shrink-0 ml-3" style={{ color: "#7dd3fc" }}>{r.matchPercent}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {key === "nextEpisode" && summary.nextEpisode && (
            <div className="py-6 text-center space-y-2">
              {summary.nextEpisode.title ? (
                <>
                  <p className="text-xs" style={{ color: "#999" }}>다음 이야기</p>
                  <p className="text-base font-medium leading-relaxed" style={{ color: "#eee" }}>
                    &ldquo;{summary.nextEpisode.title}&rdquo;
                  </p>
                  <p className="text-xs" style={{ color: "#999" }}>다음 방문에서 공개됩니다.</p>
                </>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "#eee" }}>
                  다음 방문 시
                  <br />EP.{summary.nextEpisode.episodeNumber}이 열립니다.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid #262626" }}>
            <div className="flex gap-1.5">
              {steps.map((s, idx) => (
                <span
                  key={s}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ background: idx === i ? "#eee" : "#3a3a3a" }}
                />
              ))}
            </div>
            {isLast ? (
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="text-xs px-3 py-2" style={{ color: "#999" }}>
                  이 공간으로 돌아가기
                </button>
                <Link
                  href="/archive"
                  className="text-xs px-4 py-2 border transition-colors hover:bg-white hover:text-black"
                  style={{ borderColor: "#eee", color: "#eee" }}
                >
                  내 아카이브 보기
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={next}
                className="text-xs px-4 py-2 border transition-colors hover:bg-white hover:text-black"
                style={{ borderColor: "#eee", color: "#eee" }}
              >
                다음
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
