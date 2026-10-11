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
        className="ed-modal-panel relative mx-auto mt-12 w-[min(1280px,calc(100%-64px))] min-h-[calc(100vh-48px)] rounded-t-[var(--ed-radius-lg)] outline-none"
        style={{ background: "var(--ed-bg)", color: "var(--ed-fg)" }}
      >
        <div className="sticky top-3 z-20 h-0 flex justify-end pr-3 pointer-events-none">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="공간 상세 닫기"
            className="pointer-events-auto mt-3 w-11 h-11 inline-flex items-center justify-center rounded-[var(--ed-radius)] backdrop-blur-sm"
            style={{ background: "color-mix(in srgb, var(--ed-bg) 88%, transparent)", color: "var(--ed-fg)", border: "1px solid var(--ed-line)" }}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
