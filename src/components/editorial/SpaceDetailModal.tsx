"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons";
import { rememberModalOnLeave } from "@/lib/editorial/modalRestore";

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
 *
 * 새로고침해도 창 유지(src/lib/editorial/modalRestore.ts): 창이 열린 채 문서를 떠나면 짧은 쿠키를 남기고,
 * 다음 요청의 /spaces/[slug] 서버 페이지가 HOME + 이 창(restored)을 그린다. restored 창 위에 앱 안 이동으로 새 창(가로채기)이 뜨면
 * restored 창은 숨고(globals.css) 키 입력도 위 창에 양보한다 — 두 창이 함께 뒤로 가지 않게.
 */
export default function SpaceDetailModal({ children, restored = false }: { children: React.ReactNode; restored?: boolean }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // 내용 상자의 스크롤바 폭(macOS 겹침 스크롤바는 0)
  const [bar, setBar] = useState(0);
  // X · 바깥 클릭 · ESC로 닫는 중 — 이때 문서가 바뀌면(새로고침으로 복원된 창의 뒤로 가기) 도착 공간도 창으로 그린다
  const closingRef = useRef(false);
  const close = () => {
    closingRef.current = true;
    router.back();
  };
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

    // 창이 열린 채 이 문서를 떠나면(새로고침 · 뒤로/앞으로 · 탭 닫기) 다음 요청에서 창으로 다시 그리도록 알린다.
    // beforeunload — 다음 문서 요청이 나가기 전에 실행된다(pagehide는 새 요청을 보낸 뒤라 쿠키가 실리지 않는다 — 실측)
    const onLeave = () => rememberModalOnLeave(closingRef.current);
    window.addEventListener("beforeunload", onLeave);

    const onKey = (e: KeyboardEvent) => {
      // 복원된 창 위에 다른 창이 떠 있으면 키 입력은 위 창 몫
      if (restored && document.querySelector(".ed-modal-root:not([data-restored])")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      // X(고정 형제)까지 포함 — 창 루트 안의 모든 포커스 대상. X는 position: fixed라 offsetParent가 null이어도 보인다
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === closeRef.current);
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
      window.removeEventListener("beforeunload", onLeave);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      opener?.focus?.({ preventScroll: true });
    };
    // close는 router · closingRef만 쓴다(매 렌더 새 함수라 의존성에서 뺀다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, router, restored]);

  if (!desktop) return null;

  // 창 폭 — 껍데기와 X가 같은 식을 쓴다(내용 상자 스크롤바 폭만큼 넓혀 본문 720px 유지)
  const width = `min(800px, 100% - 64px) + ${bar}px`;

  return (
    // 창 루트(position 없음 — 위치 기준을 만들지 않는다): [바탕 > 껍데기 > 스크롤 내용] 과 [X] 가 형제.
    // X는 스크롤되는 어떤 요소의 자손도, 열림 애니메이션(transform)이 걸린 껍데기의 자손도 아니다 → 화면(viewport) 기준 fixed로 1px도 움직이지 않는다.
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="공간 상세"
      tabIndex={-1}
      className="ed-modal-root outline-none"
      data-restored={restored ? "" : undefined}
    >
      <div
        className="ed-modal-backdrop fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(2px)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        // 창 바깥(어두운 바탕)에서 굴린 휠도 내용 상자를 스크롤한다(바탕 자체는 스크롤되지 않음)
        onWheel={(e) => { if (e.target === e.currentTarget) scrollRef.current?.scrollBy({ top: e.deltaY }); }}
      >
        {/* 창 껍데기 — 스크롤하지 않는다(열림 애니메이션은 여기에만) */}
        <div
          className="ed-modal-panel relative mx-auto mt-12 h-[calc(100dvh-48px)] overflow-hidden rounded-t-[var(--ed-radius-lg)]"
          style={{ width: `calc(${width})`, background: "var(--ed-bg)", color: "var(--ed-fg)" }}
        >
          {/* 내용 상자 — 상세 전체가 여기서만 스크롤된다 */}
          <div ref={scrollRef} tabIndex={-1} className="h-full overflow-y-auto outline-none" style={{ overscrollBehavior: "contain" }}>
            {children}
          </div>
        </div>
      </div>
      {/* X — 화면 기준 fixed, 바탕 · 껍데기 · 스크롤 내용 밖의 형제. 위치는 껍데기와 같은 폭 식으로 계산:
          top = 껍데기 위(48px) + 6px, right = 화면 오른쪽에서 껍데기 오른쪽까지((100% − 폭) / 2) + 2px + 스크롤바 폭.
          본문 좌우 여백(40px) 안이라 대표 사진(본문 720px, 위 여백 pt-14 아래)과 겹치지 않는다. 테두리 · 상자 없이 X만, 누르는 영역 44px.
          위치는 인라인으로 — .ed-close-btn(globals.css, 레이어 밖)의 position: relative가 Tailwind 유틸리티를 이긴다. */}
      <button
        ref={closeRef}
        type="button"
        onClick={close}
        onWheel={(e) => scrollRef.current?.scrollBy({ top: e.deltaY })}
        aria-label="공간 상세 닫기"
        className="ed-close-btn ed-modal-close"
        style={{ position: "fixed", zIndex: 71, top: 54, right: `calc((100% - (${width})) / 2 + ${2 + bar}px)` }}
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
