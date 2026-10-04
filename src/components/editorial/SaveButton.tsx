"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  /** EditorialSpace.id */
  spaceId: string;
  spaceName: string;
  initialSaved: boolean;
  loggedIn: boolean;
  /** icon: 카드 위 작은 아이콘 / text: 상세 페이지 버튼 */
  variant?: "icon" | "text";
}

/**
 * 공간 저장 — 누르는 즉시 표시를 바꾸고(낙관적), 서버 응답의 최종 상태로 다시 맞춘다.
 * 요청이 진행 중일 때 다시 누르면 무시해 순서가 뒤바뀐 응답으로 화면과 DB가 어긋나지 않게 한다.
 * 실패하면 원래 상태로 되돌리고 짧게 알린다. 비로그인이면 로그인 후 같은 페이지로 돌아온다.
 */
export default function SaveButton({ spaceId, spaceName, initialSaved, loggedIn, variant = "icon" }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  async function toggle(e: React.MouseEvent) {
    // 카드 전체가 링크인 곳에서도 상세로 이동하지 않게 한다.
    e.preventDefault();
    e.stopPropagation();
    // 로그인 후 돌아올 곳은 검색어·지역까지 포함한 지금 주소(/find?area=망원 → 로그인 → 같은 화면)
    const here = `${pathname}${window.location.search}`;
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    const prev = saved;
    setSaved(!prev);
    setError(false);
    try {
      const res = await fetch(`/api/saves/spaces/${spaceId}`, { method: prev ? "DELETE" : "POST" });
      if (res.status === 401) {
        setSaved(prev);
        router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
      if (!res.ok || typeof data.saved !== "boolean") throw new Error("save failed");
      setSaved(data.saved);
    } catch {
      setSaved(prev);
      setError(true);
    } finally {
      inFlight.current = false;
    }
  }

  const label = saved ? `${spaceName} 저장 해제` : `${spaceName} 저장`;
  const icon = (
    <svg viewBox="0 0 24 24" width={variant === "icon" ? 18 : 16} height={variant === "icon" ? 18 : 16} aria-hidden>
      <path d="M6 3.75h12v16.5l-6-4.2-6 4.2z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );

  if (variant === "text") {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          aria-label={label}
          className="tap-target inline-flex items-center gap-2 px-4 text-sm font-semibold transition-colors"
          style={saved ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-fg)" }}
        >
          {icon}
          {saved ? "저장됨" : "저장하기"}
        </button>
        <span aria-live="polite" className="text-xs" style={{ color: "var(--ed-dim)" }}>{error ? "저장하지 못했어요. 잠시 후 다시 시도해주세요." : ""}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={error ? "저장하지 못했어요. 다시 시도해주세요." : label}
      className="relative z-10 -m-3 p-3 shrink-0 inline-flex items-center justify-center"
      style={{ color: error ? "#a1271b" : "var(--ed-fg)" }}
    >
      {icon}
    </button>
  );
}
