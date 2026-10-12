"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
 *
 * 구조(X 화면 고정): 바탕(fixed, 스크롤 없음) > 창 껍데기(relative, 높이 고정, 스크롤 없음) > [X(absolute) · 내용 상자(overflow-y-auto)].
 * X는 스크롤되는 상자 밖, 껍데기 기준이라 내용을 얼마나 내려도 화면 좌표가 변하지 않는다(sticky 의존 없음).
 * 내용 상자의 세로 스크롤바 폭만큼 껍데기를 넓히고 X를 그만큼 안쪽에 둔다 → 본문 폭(720px) · 사진 크기 그대로, X가 스크롤바를 가리지 않음.
 */
export default function SpaceDetailModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 내용 상자의 스크롤바 폭(macOS 겹침 스크롤바는 0)
  const [bar, setBar] = useState(0);
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
    // 처음 포커스는 내용 상자에 — 키보드(↓ · PageDown · Space)로 바로 내용이 스크롤된다
    scrollRef.current?.focus({ preventScroll: true });
    const measure = () => { const el = scrollRef.current; if (el) setBar(el.offsetWidth - el.clientWidth); };
    measure();
    window.addEventListener("resize", measure);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); router.back(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current || active === scrollRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      opener?.focus?.({ preventScroll: true });
    };
  }, [desktop, router]);

  if (!desktop) return null;

  return (
    <div
      className="ed-modal-backdrop fixed inset-0 z-[70]"
      style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) router.back(); }}
      // 창 바깥(어두운 바탕)에서 굴린 휠도 내용 상자를 스크롤한다(바탕 자체는 스크롤되지 않음)
      onWheel={(e) => { if (e.target === e.currentTarget) scrollRef.current?.scrollBy({ top: e.deltaY }); }}
    >
      {/* 창 껍데기 — 스크롤하지 않는다. X와 내용 상자의 공통 기준(relative). */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="공간 상세"
        tabIndex={-1}
        className="ed-modal-panel relative mx-auto mt-12 h-[calc(100dvh-48px)] overflow-hidden rounded-t-[var(--ed-radius-lg)] outline-none"
        style={{ width: `calc(min(800px, 100% - 64px) + ${bar}px)`, background: "var(--ed-bg)", color: "var(--ed-fg)" }}
      >
        {/* X — 껍데기 오른쪽 위(absolute), 스크롤되는 내용 상자 밖. 본문 좌우 여백(40px) 안이라 대표 사진(위 여백 pt-14 아래, 본문 720px)과 겹치지 않는다.
            테두리 · 상자 없이 X만, 누르는 영역 44px. 반투명 원(.ed-close-btn)은 내용이 X 아래로 지나갈 때만 보인다. */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="공간 상세 닫기"
          className="ed-close-btn z-20"
          // 위치는 인라인으로 — .ed-close-btn(globals.css, 레이어 밖)의 position: relative가 Tailwind의 absolute 유틸리티를 이긴다
          style={{ position: "absolute", top: 6, right: 2 + bar }}
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        {/* 내용 상자 — 상세 전체가 여기서만 스크롤된다 */}
        <div ref={scrollRef} tabIndex={-1} className="h-full overflow-y-auto outline-none" style={{ overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
