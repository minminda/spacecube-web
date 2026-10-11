"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StarIcon } from "@/components/icons";
import { MAX_SAVED_REGIONS, REGION_COOKIE, REGION_COOKIE_MAX_AGE, parseRegionCookie, serializeRegionCookie, withRegion } from "@/lib/regions/saved";

const CHANGE_EVENT = "sc-region-change";

function readCookieRegions(): string[] {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${REGION_COOKIE}=`));
  return parseRegionCookie(hit?.slice(REGION_COOKIE.length + 1));
}

interface Props {
  area: string;
  initialSaved: boolean;
  loggedIn: boolean;
  /** 저장하면 서버 화면(HOME 선반 · 내 공간)을 다시 그린다 */
  refresh?: boolean;
  /** 버튼 크기 — md 44px(기본), sm 36px(촘촘한 줄) */
  size?: "md" | "sm";
  className?: string;
}

/**
 * 관심 지역 별표 — 윤곽선 별(저장 안 됨) / 채운 별(저장됨). 색은 글자색 하나(노랑 · 장식 없음).
 * 로그인 사용자는 계정(/api/regions)에, 비로그인은 이 브라우저의 쿠키(sc_regions)에 저장한다 — HOME이 서버에서 읽어 선반을 만든다.
 * 같은 지역의 별이 한 화면에 여럿(지역 목록 · 제목)일 때 서로 맞춘다(이벤트). 실패하면 원래 상태로 되돌린다.
 */
export default function RegionStar({ area, initialSaved, loggedIn, refresh = false, size = "md", className = "" }: Props) {
  const router = useRouter();
  // 사용자가 누른 결과(없으면 서버가 준 값) — 서버 값이 바뀌면(refresh) 그 값을 그대로 따른다
  const [local, setLocal] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const saved = local ?? initialSaved;

  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ area: string; saved: boolean }>).detail;
      if (d.area === area) setLocal(d.saved);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [area]);

  const announce = (next: boolean) => window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { area, saved: next } }));

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); // 지역 행(링크) 안에 있어도 이동하지 않는다
    if (busy) return;
    const next = !saved;
    setLocal(next);
    announce(next);
    setBusy(true);
    try {
      if (loggedIn) {
        const res = await fetch("/api/regions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area, saved: next }) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "저장하지 못했어요.");
        }
      } else {
        const list = withRegion(readCookieRegions(), area, next);
        if (next && !list.includes(area)) throw new Error(`관심 지역은 ${MAX_SAVED_REGIONS}곳까지 저장할 수 있어요.`);
        document.cookie = `${REGION_COOKIE}=${serializeRegionCookie(list)}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; samesite=lax`;
      }
      if (refresh) router.refresh();
    } catch (err) {
      setLocal(!next);
      announce(!next);
      setNote(err instanceof Error ? err.message : "저장하지 못했어요.");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setNote(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  const box = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={`${area} 관심 지역 ${saved ? "해제" : "저장"}`}
        className={`${box} inline-flex items-center justify-center transition-colors hover:text-[var(--ed-fg)]`}
        style={{ color: saved ? "var(--ed-fg)" : "var(--ed-dim)" }}
      >
        <StarIcon filled={saved} className={size === "sm" ? "w-[18px] h-[18px]" : "w-5 h-5"} strokeWidth={1.6} />
      </button>
      {note && (
        <span role="status" className="absolute right-0 top-full z-20 mt-1 px-2.5 py-1.5 text-xs whitespace-nowrap" style={{ background: "var(--ed-fg)", color: "var(--ed-bg)" }}>
          {note}
        </span>
      )}
    </span>
  );
}
