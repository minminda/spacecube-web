"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { readingProgress } from "@/lib/editorial/readingProgress";

/** Navbar 높이(h-14 56px + 아래 테두리 1px). 진행 바는 그 바로 아래에 붙고, 0%는 글 위쪽이 이 선에 닿은 상태다. */
const NAV_HEIGHT = 57;

/**
 * 상세 글 읽기 진행 바 — Navbar 바로 아래 전체 폭 2px(연회색 바탕 위 검정). 감싼 영역(제목 ~ 마지막 본문 블록)만 기준으로 계산하므로
 * 아래의 관련 공간 · 다른 이야기 · 푸터는 진행률에 들어가지 않는다(본문 끝 = 100%).
 * StoryArticle · CurationArticle이 쓰므로 공개 상세와 관리자 미리보기(iframe)가 같다 — iframe 안에서는 그 문서의
 * window로 계산되어 관리자 화면 스크롤과 섞이지 않는다.
 * React 상태 없이 rAF 한 번에 transform만 바꾼다(스크롤 중 리렌더 없음). 이미지 로딩 · 회전 · 리사이즈는
 * ResizeObserver와 resize로, 다른 글로 이동하면 pathname으로 다시 잰다. 시각 보조라 스크린리더에서는 숨긴다.
 */
export default function ReadingProgress({ children }: { children: React.ReactNode }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const area = areaRef.current;
    const bar = barRef.current;
    if (!area || !bar) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = area.getBoundingClientRect();
      const y = window.scrollY;
      const p = readingProgress({
        scrollY: y,
        viewportHeight: window.innerHeight,
        articleTop: rect.top + y,
        articleBottom: rect.bottom + y,
        topOffset: NAV_HEIGHT,
      });
      bar.style.transform = `scaleX(${p})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(area);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <>
      <div ref={areaRef}>{children}</div>
      {/* 연회색 바탕 선 위에 검정이 찬다 — 검정 Navbar 바로 아래라 바탕 선이 없으면 진행 끝이 보이지 않는다 */}
      <div aria-hidden className="fixed inset-x-0 top-[57px] z-40 h-[2px] pointer-events-none" style={{ background: "var(--ed-line)" }}>
        <div
          ref={barRef}
          className="h-full origin-left transition-transform duration-75 ease-linear motion-reduce:transition-none"
          style={{ background: "var(--ed-fg)", transform: "scaleX(0)" }}
        />
      </div>
    </>
  );
}
