"use client";

import { useEffect, useRef, useState } from "react";
import { computeSceneProgress, type SceneBounds } from "@/lib/readingProgress";

interface Props {
  sceneCount: number;
}

// Navbar(h-14=56px, sticky top-0)가 항상 화면 위를 차지하므로, 그 바로 아래 지점을
// "지금 읽고 있는 위치"(readLine) 기준으로 삼는다 — Scene의 top이 이 선을 지나면 채워지기
// 시작하고, bottom이 이 선을 지나면 100%가 되어 다음 Scene으로 넘어간다.
const READ_LINE_OFFSET = 72;

/**
 * Episode 상세 페이지 상단에 표시되는 Scene별 5분할(실제로는 Scene 개수만큼) Reading
 * Progress. 전체 문서 스크롤 비율이 아니라 각 Scene wrapper(`data-scene-order`)의 실제
 * DOM 영역을 기준으로 계산하므로 Scene마다 길이가 달라도 정확하다. 위로 스크롤하면
 * 진행도도 함께 줄어든다("최대 읽은 위치"가 아니라 "현재 위치"를 그대로 반영).
 *
 * Story Complete/EpisodeRead 등 기존 analytics와는 완전히 분리된 순수 시각 컴포넌트다 —
 * 여기서는 아무것도 서버에 기록하지 않는다.
 */
export default function SceneReadingProgress({ sceneCount }: Props) {
  const [progress, setProgress] = useState<number[]>(() => Array(sceneCount).fill(0));
  const boundsRef = useRef<SceneBounds[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (sceneCount === 0) return;

    const getSceneNodes = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-scene-order]")).sort(
        (a, b) => Number(a.dataset.sceneOrder) - Number(b.dataset.sceneOrder),
      );

    const measure = () => {
      boundsRef.current = getSceneNodes().map((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        return { top, bottom: top + el.offsetHeight };
      });
    };

    const update = () => {
      const readLine = window.scrollY + READ_LINE_OFFSET;
      setProgress(computeSceneProgress(readLine, boundsRef.current));
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // 사진이 있는 Scene은 이미지 로드 이후 높이가 바뀔 수 있으므로 각 Scene wrapper의
    // 크기 변화를 감시해 다시 측정한다(스크롤마다 반복 측정하지 않고 이때만).
    const resizeObserver = new ResizeObserver(onResize);
    getSceneNodes().forEach((el) => resizeObserver.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [sceneCount]);

  if (sceneCount === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="sticky top-14 z-40"
      style={{ background: "var(--bg)", pointerEvents: "none" }}
    >
      <div className="flex" style={{ gap: 3, paddingTop: 10, paddingBottom: 10 }}>
        {progress.map((p, i) => (
          <div
            key={i}
            className="flex-1 overflow-hidden"
            style={{ height: 3, borderRadius: 1, background: "var(--border)" }}
          >
            <div style={{ width: `${p * 100}%`, height: "100%", background: "var(--fg)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
