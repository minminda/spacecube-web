"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SpaceCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  type: string;
  openingHours: string | null;
  imageUrl: string | null;
  district?: string | null;
  naverMapUrl?: string | null;
}

interface Props {
  spaces: SpaceCard[];
  /** 방문(Record) 또는 큐브 QR 해제 기록이 있어 잠금이 풀린 공간 ID 목록 */
  visitedSpaceIds?: string[];
}

export default function SpaceCards({ spaces, visitedSpaceIds = [] }: Props) {
  const router = useRouter();
  const visitedSet = new Set(visitedSpaceIds);
  const [lockedSpace, setLockedSpace] = useState<SpaceCard | null>(null);

  // 잠긴 공간 안내 Bottom Sheet — ESC로 닫기
  useEffect(() => {
    if (!lockedSpace) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLockedSpace(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lockedSpace]);

  if (spaces.length === 0) return null;

  function handleOpen(space: SpaceCard, isVisited: boolean) {
    if (isVisited) {
      router.push(`/space/${space.slug}`);
      return;
    }
    // 잠긴 공간은 상세 페이지로 바로 보내지 않는다 — 실제 공간에서 QR을 스캔해야
    // 열린다는 걸 알려주는 안내만 띄운다(브라우저 URL은 바뀌지 않는다).
    setLockedSpace(space);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 pb-8">
      {spaces.map((space) => {
        const isVisited = visitedSet.has(space.id);
        return (
          <div
            key={space.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer group"
            onClick={() => handleOpen(space, isVisited)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen(space, isVisited);
              }
            }}
          >
            {space.imageUrl && (
              <div
                className="relative w-full overflow-hidden mb-4"
                style={{ aspectRatio: "16 / 10" }}
              >
                <Image
                  src={space.imageUrl}
                  alt={space.name}
                  fill
                  className={`object-cover transition-transform duration-500 group-hover:scale-105 ${!isVisited ? "scale-105 blur-[1.5px] brightness-[0.55]" : ""}`}
                />
                {!isVisited && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-4">
                    <span className="text-lg" style={{ color: "rgba(255,255,255,0.9)" }}>◇</span>
                    <span className="text-xs font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>
                      잠긴 공간
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <p className="text-base font-semibold leading-snug flex-1">{space.name}</p>
                {isVisited && (
                  <span
                    className="text-xs flex-shrink-0 px-1.5 py-0.5 border mt-0.5"
                    style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                  >
                    방문함
                  </span>
                )}
              </div>
              {space.tagline && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                  {space.tagline}
                </p>
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
            </div>
          </div>
        );
      })}

      {/* ── 잠긴 공간 안내 Bottom Sheet ── */}
      {lockedSpace && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setLockedSpace(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="잠긴 공간 안내"
            className="w-full sm:max-w-sm p-6 space-y-5"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderBottom: "none" }}
          >
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{lockedSpace.name}</p>
              <p className="text-lg font-semibold leading-relaxed whitespace-pre-line">
                {"이 공간의 이야기는\n공간에서 열립니다."}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                공간에 놓인 큐브를 찾아 QR을 스캔해 잠금을 해제해보세요.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
                잠금을 해제하면 공간의 이야기와 방문자들의 흔적을 볼 수 있어요.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {lockedSpace.naverMapUrl && (
                <a
                  href={lockedSpace.naverMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center text-sm py-3 border"
                  style={{ borderColor: "var(--fg)" }}
                >
                  위치 확인하기
                </a>
              )}
              <button
                type="button"
                onClick={() => setLockedSpace(null)}
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
