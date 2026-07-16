"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { RewardRecommendation } from "@/lib/guestbookReward";

/* ── 추천 공간 카드(잠금 UX) ──────────────────────────────────────────
   공간의 상세 이야기는 현장에서 QR을 인식해야 열린다는 원칙에 맞춰, 추천 카드는
   "다음 방문 후보 제시 + 위치 연결"까지만 한다. 잠긴 공간은 카드를 눌러도 상세
   페이지로 바로 보내지 않고 안내 Bottom Sheet만 띄운다(discover/SpaceCards.tsx와
   동일한 인터랙션 패턴 재사용, 문구는 이 화면 전용). ───────────────────────── */

interface Props {
  rec: RewardRecommendation;
}

export default function RecommendationCard({ rec }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDialogOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen]);

  function handleClick() {
    if (rec.locked) {
      setDialogOpen(true);
      return;
    }
    router.push(`/space/${rec.slug}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="cursor-pointer group space-y-2"
    >
      {rec.imageUrl && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
          <Image
            src={rec.imageUrl}
            alt={rec.name}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${rec.locked ? "scale-105 blur-[1.5px] brightness-[0.55]" : ""}`}
          />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug truncate">{rec.name}</p>
        <p className="text-xs" style={{ color: "var(--dim)" }}>{rec.type}{rec.district ? ` · ${rec.district}` : ""}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{rec.reason}</p>

        {rec.locked ? (
          <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
            🔒 잠겨 있음
            <br />
            공간에서 QR을 인식하면 이야기가 열립니다.
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--dim)" }}>◇ 해제됨</p>
        )}

        {rec.naverMapUrl && (
          <a
            href={rec.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-block text-xs py-1.5 px-3 border mt-1"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            위치 보기
          </a>
        )}
      </div>

      {/* ── 잠긴 공간 안내 Bottom Sheet ── */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="잠긴 공간 안내"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm p-6 space-y-5"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderBottom: "none" }}
          >
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{rec.name}</p>
              <p className="text-lg font-semibold leading-relaxed whitespace-pre-line">
                {"이 공간의 이야기는\n아직 잠겨 있습니다."}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                {"공간을 방문해 큐브의 QR을 인식하면\n공간 이야기와 방명록이 열립니다."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {rec.naverMapUrl && (
                <a
                  href={rec.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center text-sm py-3 border"
                  style={{ borderColor: "var(--fg)" }}
                >
                  위치 보기
                </a>
              )}
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="w-full text-sm py-3 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
