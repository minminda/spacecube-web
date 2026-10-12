"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons";

/** 프로젝트의 휴대폰/데스크톱 경계(Tailwind md) — 그 미만은 창이 아니라 독립 페이지 */
const DESKTOP_QUERY = "(min-width: 768px)";
const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

function subscribeDesktop(cb: () => void) {
  const m = window.matchMedia(DESKTOP_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/**
 * 데스크톱에서 공간 카드를 눌렀을 때 탐색 화면 위에 띄우는 상세 창(@modal 가로채기 라우트).
 * 뒤의 화면은 그대로 남아 있어 닫으면 스크롤 · 선반 위치가 유지된다. 닫기 = X · 바깥 클릭 · ESC (모두 router.back()).
 * 좁은 화면(휴대폰)에서는 창을 만들지 않고 같은 주소를 독립 페이지로 다시 불러온다.
 */
export default function SpaceDetailModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);

  useEffect(() => {
    // 휴대폰: 창 대신 정상 페이지 이동(주소는 그대로, 이전 기록도 그대로)
    if (!window.matchMedia(DESKTOP_QUERY).matches) window.location.reload();
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const opener = document.activeElement as HTMLElement | null;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    panelRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); router.back(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      opener?.focus?.({ preventScroll: true });
    };
  }, [desktop, router]);

  if (!desktop) return null;

  return (
    <div
      className="ed-modal-backdrop fixed inset-0 z-[70] overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(2px)", overscrollBehavior: "contain" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) router.back(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="공간 상세"
        tabIndex={-1}
        className="ed-modal-panel relative mx-auto mt-12 w-[min(800px,calc(100%-64px))] min-h-[calc(100vh-48px)] rounded-t-[var(--ed-radius-lg)] outline-none"
        style={{ background: "var(--ed-bg)", color: "var(--ed-fg)" }}
      >
        {/* X — 창 오른쪽 위 모서리, 본문 좌우 여백(40px) 안. 대표 사진(본문 폭 720px, 위 여백 pt-14 아래)과 가로 · 세로 모두 겹치지 않는다.
            테두리 · 상자 없이 글자만 보이고, 누르는 영역은 44px. 스크롤해 아래 내용 위를 지날 때만 반투명 원이 X를 받쳐 준다
            (창 바탕과 같은 색이라 맨 위에서는 보이지 않음). */}
        <div className="sticky top-0 z-20 h-0 flex justify-end pointer-events-none">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="공간 상세 닫기"
            className="ed-close-btn pointer-events-auto mt-1.5 mr-0.5"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
