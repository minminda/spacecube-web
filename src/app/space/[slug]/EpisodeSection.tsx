"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EpisodeState } from "@/lib/episodeState";

interface EpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
  unlockVisitCount: number;
  state: EpisodeState;
  /** 아직 관리자가 만들지 않은, "다음에 올" 이야기 자리 — 재방문 동기를 위한 예고 카드 */
  isPlaceholder?: boolean;
}

export type BannerInfo =
  | { type: "first" }
  | { type: "new"; count: number }
  | { type: "locked"; count: number }
  | { type: "allUnlocked" }
  | null;

interface Props {
  spaceSlug: string;
  episodes: EpisodeSummary[];
  banner: BannerInfo;
}

type DialogKind = "locked" | "comingSoon" | null;

export default function EpisodeSection({ spaceSlug, episodes, banner }: Props) {
  const [dialog, setDialog] = useState<DialogKind>(null);

  // 안내 Bottom Sheet — ESC로 닫기 (SpaceCards.tsx의 잠긴 공간 안내와 동일한 패턴)
  useEffect(() => {
    if (!dialog) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDialog(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  if (episodes.length === 0) return null;

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>Episode</p>

      {banner && (
        <div
          className="px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: "var(--tag-bg)", color: "var(--dim)" }}
        >
          {banner.type === "first" && "이 공간의 첫 번째 이야기가 열렸습니다."}
          {banner.type === "new" && "새로운 이야기가 열렸습니다."}
          {banner.type === "locked" && "다음 방문에서 또 다른 이야기가 기다리고 있습니다."}
          {banner.type === "allUnlocked" && "이 공간의 모든 이야기를 발견했습니다."}
        </div>
      )}

      <div className="space-y-1.5">
        {episodes.map((ep) => {
          if (ep.isPlaceholder) {
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => setDialog("comingSoon")}
                className="flex items-center gap-2.5 px-4 py-3 border border-dashed w-full text-left transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border)", opacity: 0.55 }}
              >
                <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>EP.{ep.episodeNumber}</span>
                <span className="text-sm flex-1" style={{ color: "var(--dim)" }}>다음 이야기 (예정)</span>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>준비 중</span>
              </button>
            );
          }

          const body = (
            <div className="flex items-center gap-2.5 px-4 py-3.5">
              <span className="text-xs flex-shrink-0" style={{ color: "var(--dim)" }}>EP.{ep.episodeNumber}</span>
              <span
                className="text-sm flex-1 min-w-0 truncate"
                style={{ color: ep.state !== "LOCKED" ? "var(--fg)" : "var(--dim)" }}
              >
                {ep.title}
              </span>
              {(ep.state === "UNLOCKED" || ep.state === "NEWLY_UNLOCKED") && (
                <span
                  className={`text-xs flex-shrink-0${ep.state === "NEWLY_UNLOCKED" ? " episode-newly-unlocked" : ""}`}
                  style={{ color: "var(--dim)" }}
                >
                  ✓ 해제됨
                </span>
              )}
              {ep.state === "LOCKED" && (
                <span className="text-xs flex-shrink-0" aria-hidden>🔒 잠겨 있음</span>
              )}
            </div>
          );

          if (ep.state !== "LOCKED") {
            return (
              <div key={ep.id} className="border" style={{ borderColor: "var(--border)" }}>
                <Link href={`/space/${spaceSlug}/episodes/${ep.id}`} className="block transition-colors hover:bg-[var(--tag-bg)]">
                  {body}
                </Link>
              </div>
            );
          }

          return (
            <button
              key={ep.id}
              type="button"
              onClick={() => setDialog("locked")}
              className="w-full text-left border transition-opacity opacity-[0.45] hover:opacity-[0.7]"
              style={{ borderColor: "var(--border)" }}
            >
              {body}
            </button>
          );
        })}
      </div>

      {/* ── Episode 안내 Bottom Sheet(잠김 / 준비 중) ── */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dialog === "locked" ? "잠긴 이야기 안내" : "준비 중인 이야기 안내"}
            className="w-full sm:max-w-sm p-6 space-y-5"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderBottom: "none" }}
          >
            <div className="space-y-2.5">
              <p className="text-lg font-semibold leading-relaxed">
                {dialog === "locked" ? "아직 열리지 않았습니다." : "다음 이야기를 준비하고 있습니다."}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                {dialog === "locked"
                  ? "이 공간을 다시 방문하면\n다음 이야기가 열립니다."
                  : "운영자가 새로운 이야기를 준비 중입니다.\n다시 방문해 주세요."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="w-full text-sm py-3 border"
              style={{ borderColor: "var(--fg)" }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 새로 해제된 Episode 표시는 UNLOCKED와 동일한 "✓ 해제됨" 텍스트를 쓰고, 아주 옅은
          fade-in만으로 변화를 알린다 — 반짝임·확대축소 같은 장식 효과는 두지 않는다. */}
      <style>{`
        @keyframes episodeNewlyUnlockedIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .episode-newly-unlocked {
          animation: episodeNewlyUnlockedIn 0.6s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .episode-newly-unlocked { animation: none; }
        }
      `}</style>
    </section>
  );
}
