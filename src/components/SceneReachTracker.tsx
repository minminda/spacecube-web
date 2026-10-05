"use client";

import { useEffect, useRef } from "react";
import { computeSceneProgress, type SceneBounds } from "@/lib/readingProgress";

interface Props {
  sceneCount: number;
}

// Navbar(h-14=56px, sticky top-0)가 항상 화면 위를 차지하므로, 그 바로 아래 지점을
// "지금 읽고 있는 위치"(readLine) 기준으로 삼는다 — Scene의 top이 이 선을 지나면 채워지기
// 시작하고, bottom이 이 선을 지나면 100%가 되어 다음 Scene으로 넘어간다.
const READ_LINE_OFFSET = 72;

// 페이지 최하단 판정 여유값 — 브라우저/모바일 주소창 변화에 따른 소수점 스크롤 오차만
// 흡수하면 되므로 작게 둔다(과도한 threshold로 억지 보정하지 않는다).
const PAGE_BOTTOM_THRESHOLD = 4;

// Story Depth 분석에서 "Scene에 도달했다"고 기록하는 최소 진행 비율. readLine은 이미
// 뷰포트 맨 아래가 아니라 헤더 바로 아래(READ_LINE_OFFSET)에 고정돼 있으므로, 이 값이 0보다
// 살짝만 커도 이미 Scene 제목이 화면의 실제 읽기 영역에 들어온 뒤다 — 1px가 뷰포트 하단에
// 걸치는 것과는 다른, 모든 Scene에 동일하게 적용되는 기준이다.
const SCENE_REACH_THRESHOLD = 0.08;

interface SceneNode extends SceneBounds {
  sceneId: string;
}

/**
 * Episode 상세의 Story Depth 분석 — Scene 2 이상에 처음 도달하면 서버에 한 번 기록한다(화면에는 아무것도 그리지 않는다).
 * 예전에는 Scene별 5분할 진행 표시를 함께 그렸지만, 2026-10-05부터 화면 진행 표시는 STORY · CURATION과 같은
 * 하나의 연속 Reading Progress Bar(components/editorial/ReadingProgress)로 바뀌었다 — 이 컴포넌트는 계측만 남긴 것.
 * 각 Scene wrapper(`data-scene-order`)의 실제 DOM 영역 기준으로 계산하므로 Scene마다 길이가 달라도 정확하다.
 * 기록은 "이번 방문의 최고 도달점"이라 위로 스크롤해도 취소되지 않는다.
 * Story Complete/EpisodeRead 판정 로직은 전혀 건드리지 않는다(StoryReadTracker가 별도로 담당).
 */
export default function SceneReachTracker({ sceneCount }: Props) {
  const nodesRef = useRef<SceneNode[]>([]);
  const rafRef = useRef<number | null>(null);
  // 이번 페이지 열람(마운트~언마운트)에서 이미 서버에 보고한 sceneId — 위로 스크롤해도
  // 지우지 않는다(Analytics는 "최고 도달점"이지 현재 위치가 아니므로).
  const reachedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (sceneCount === 0) return;

    const getSceneNodes = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-scene-order]")).sort(
        (a, b) => Number(a.dataset.sceneOrder) - Number(b.dataset.sceneOrder),
      );

    const measure = () => {
      nodesRef.current = getSceneNodes().map((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        return { sceneId: el.dataset.sceneId ?? "", top, bottom: top + el.offsetHeight };
      });
    };

    // Scene 1은 Story View(EpisodeRead)와 사실상 동시에 발생해 중복이므로 기록하지 않는다
    // (index 0 건너뜀, Scene 2부터). 클라이언트에서 Set으로 1차 중복 방지 + 서버(reach
    // API)에서 upsert로 2차 중복 방지 — 스크롤마다 반복 요청되지 않는다(Scene당 최대 1회).
    const recordReaches = (currentProgress: number[]) => {
      for (let i = 1; i < currentProgress.length; i++) {
        if (currentProgress[i] < SCENE_REACH_THRESHOLD) continue;
        const sceneId = nodesRef.current[i]?.sceneId;
        if (!sceneId || reachedRef.current.has(sceneId)) continue;
        reachedRef.current.add(sceneId);
        fetch(`/api/scenes/${sceneId}/reach`, { method: "POST", keepalive: true });
      }
    };

    const update = () => {
      const readLine = window.scrollY + READ_LINE_OFFSET;
      // 마지막 Scene 아래 남는 여백이 뷰포트 높이보다 짧으면 readLine이 구조적으로
      // documentHeight를 넘지 못해 마지막 Scene이 100%에 도달할 수 없다 — "더 스크롤할
      // 곳이 없다"는 사실 자체를 별도로 판정해 마지막 Scene을 보정한다(readLine 계산식은
      // 그대로 두고, 이 경우에만 결과를 덮어쓴다).
      const isAtPageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - PAGE_BOTTOM_THRESHOLD;
      recordReaches(computeSceneProgress(readLine, nodesRef.current, { isAtPageBottom }));
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

  return null;
}
