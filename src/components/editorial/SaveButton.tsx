"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  /** EditorialSpace.id */
  spaceId: string;
  spaceName: string;
  initialSaved: boolean;
  loggedIn: boolean;
  /** icon: 글 옆 작은 아이콘 / corner: 카드 사진 모서리 아이콘 / text: 텍스트 버튼 / detail: 공간 상세 대표 이미지 우측 상단 아이콘 */
  variant?: "icon" | "corner" | "text" | "detail";
  /** 임시(fixture) 공간 — 서버에 요청하지 않고 화면 안에서만 켜고 끈다 */
  mock?: boolean;
  /** 저장 상태가 확정될 때(서버 응답 · 임시 공간 토글) — 같은 화면의 상태 문장을 맞출 때만 넘긴다 */
  onChange?: (saved: boolean) => void;
  /** 비로그인일 때 보낼 로그인 주소(공간 상세는 로그인 후 저장을 이어서 끝내도록 의도를 실어 보낸다 — pendingIntent.ts). 없으면 기존처럼 지금 주소로 복귀만 */
  loginHref?: () => string;
}

const ICON_SIZE = { icon: 18, corner: 14, text: 16, detail: 22 } as const;

/**
 * 공간 저장 — 누르는 즉시 표시를 바꾸고(낙관적), 서버 응답의 최종 상태로 다시 맞춘다.
 * 요청이 진행 중일 때 다시 누르면 무시해 순서가 뒤바뀐 응답으로 화면과 DB가 어긋나지 않게 한다.
 * 실패하면 원래 상태로 되돌리고 짧게 알린다. 비로그인이면 로그인 후 같은 페이지로 돌아온다.
 */
export default function SaveButton({ spaceId, spaceName, initialSaved, loggedIn, variant = "icon", mock, onChange, loginHref }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  async function toggle(e: React.MouseEvent) {
    // 카드 전체가 링크인 곳에서도 상세로 이동하지 않게 한다.
    e.preventDefault();
    e.stopPropagation();
    if (mock) {
      setSaved(!saved);
      onChange?.(!saved);
      return;
    }
    // 로그인 후 돌아올 곳은 검색어·지역까지 포함한 지금 주소(/find?area=망원 → 로그인 → 같은 화면)
    const here = `${pathname}${window.location.search}`;
    const toLogin = () => router.push(loginHref ? loginHref() : `/login?callbackUrl=${encodeURIComponent(here)}`);
    if (!loggedIn) {
      toLogin();
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
        if (!prev) toLogin();
        else router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
      if (!res.ok || typeof data.saved !== "boolean") throw new Error("save failed");
      setSaved(data.saved);
      onChange?.(data.saved);
    } catch {
      setSaved(prev);
      setError(true);
    } finally {
      inFlight.current = false;
    }
  }

  const label = saved ? `${spaceName} 저장 해제` : `${spaceName} 저장`;
  const icon = (
    <svg viewBox="0 0 24 24" width={ICON_SIZE[variant]} height={ICON_SIZE[variant]} aria-hidden>
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
          className="tap-target inline-flex items-center gap-2 px-4 text-sm font-semibold transition-colors rounded-[var(--ed-radius)]"
          style={saved ? { background: "var(--ed-fg)", color: "var(--ed-bg)", border: "1px solid var(--ed-fg)" } : { border: "1px solid var(--ed-fg)" }}
        >
          {icon}
          {saved ? "저장됨" : "저장하기"}
        </button>
        <span aria-live="polite" className="text-xs" style={{ color: "var(--ed-dim)" }}>{error ? "저장하지 못했어요. 잠시 후 다시 시도해주세요." : ""}</span>
      </span>
    );
  }

  if (variant === "corner") {
    // 사진 모서리 — 보이는 칸은 24px(사진을 거의 가리지 않음), 누르는 영역은 40px
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={label}
        title={error ? "저장하지 못했어요. 다시 시도해주세요." : label}
        className="w-10 h-10 flex items-start justify-end p-1"
      >
        <span className="w-6 h-6 inline-flex items-center justify-center rounded-[5px]" style={{ background: "rgba(255,255,255,0.92)", color: error ? "#a1271b" : "#111" }}>
          {icon}
        </span>
      </button>
    );
  }

  if (variant === "detail") {
    // 대표 이미지 위 — 44px 터치 영역, 어떤 사진 위에서도 보이도록 반투명 면 + 블러
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={label}
        title={error ? "저장하지 못했어요. 다시 시도해주세요." : label}
        className="w-11 h-11 inline-flex items-center justify-center backdrop-blur-sm rounded-[var(--ed-radius)]"
        style={{ background: "rgba(255,255,255,0.88)", color: error ? "#a1271b" : "#111" }}
      >
        {icon}
      </button>
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
