"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LockedSpaceOverlay from "@/components/LockedSpaceOverlay";

/* ── 공용 공간 카드(잠금 UX) ────────────────────────────────────────
   지역 페이지의 "내 취향과 닮은 공간 TOP3"와 전체 공간 목록이 이 컴포넌트
   하나를 공유한다 — 12시간 잠금 판정 자체는 discover/page.tsx가 서버에서
   한 번만 계산해서 내려주고(getUserUnlockSets), 이 컴포넌트는 그 결과로
   카드 표시·다이얼로그·클릭 동작만 담당한다(페이지별로 복사하지 않는다). ── */

export interface SpaceDiscoverySpace {
  id: string;
  slug: string;
  name: string;
  type: string;
  district?: string | null;
  tagline?: string | null;
  openingHours?: string | null;
  imageUrl: string | null;
  naverMapUrl?: string | null;
}

interface Props {
  space: SpaceDiscoverySpace;
  isUnlocked: boolean;
  /** "recommended" = 추천 TOP3(카테고리·지역·한줄소개·짧은 이유), "default" = 전체 목록(태그라인·영업시간). */
  variant?: "default" | "recommended";
  recommendationReason?: string;
  /** 추천 순위(1~3) — "recommended" variant에서만 작고 절제된 배지로 표시. */
  rank?: number;
  /** 예상 취향 적합도(%) — "recommended" variant 전용. */
  matchPercent?: number;
}

export default function SpaceDiscoveryCard({ space, isUnlocked, variant = "default", recommendationReason, rank, matchPercent }: Props) {
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
    if (isUnlocked) {
      router.push(`/space/${space.slug}`);
      return;
    }
    // 잠긴 공간은 상세 페이지로 바로 보내지 않는다 — 실제 공간에서 QR을 스캔해야
    // 열린다는 걸 알려주는 안내만 띄운다(브라우저 URL은 바뀌지 않는다).
    setDialogOpen(true);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer group"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {space.imageUrl && (
        <div className="relative w-full overflow-hidden mb-4" style={{ aspectRatio: "16 / 10" }}>
          <Image
            src={space.imageUrl}
            alt={space.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {!isUnlocked && <LockedSpaceOverlay />}
          {variant === "recommended" && rank && (
            <span
              className="absolute top-2 left-2 text-xs px-2 py-0.5"
              style={{ background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--border)" }}
            >
              {rank}위
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-base font-semibold leading-snug">{space.name}</p>

        {variant === "recommended" ? (
          <>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              {space.type}{space.district ? ` · ${space.district}` : ""}
              {typeof matchPercent === "number" && ` · 취향 적합도 ${matchPercent}%`}
            </p>
            {space.tagline && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{space.tagline}</p>
            )}
            {recommendationReason && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{recommendationReason}</p>
            )}
          </>
        ) : (
          <>
            {space.tagline && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{space.tagline}</p>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--dim)" }}>
              <span>{space.type}</span>
              {space.openingHours && (
                <>
                  <span>·</span>
                  <span>{space.openingHours}</span>
                </>
              )}
            </div>
          </>
        )}

        {isUnlocked ? (
          <p className="text-xs" style={{ color: "var(--dim)" }}>◇ 해제됨</p>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: "var(--border)" }}>
            잠겨 있음
            <br />
            공간에서 QR을 인식하면 열립니다
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {variant === "recommended" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="inline-block text-xs py-1.5 px-3 border"
              style={{ borderColor: "var(--fg)", color: "var(--fg)" }}
            >
              공간 자세히 보기
            </button>
          )}
          {space.naverMapUrl && (
            <a
              href={space.naverMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block text-xs py-1.5 px-3 border"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              위치 보기
            </a>
          )}
        </div>
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
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderBottom: "none",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{space.name}</p>
              <p className="text-lg font-semibold leading-relaxed">이 공간의 이야기는 잠겨 있습니다</p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--dim)" }}>
                {"공간을 방문해 큐브의 QR을 인식하면\n이야기와 방명록이 열립니다"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {space.naverMapUrl && (
                <a
                  href={space.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target flex items-center justify-center w-full text-center text-sm py-3 border"
                  style={{ borderColor: "var(--fg)" }}
                >
                  위치 보기
                </a>
              )}
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="tap-target w-full text-sm py-3 border"
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
