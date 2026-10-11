"use client";

import { useEffect, useState } from "react";

export interface SiteViewer {
  loggedIn: boolean;
  admin: boolean;
  editorial: boolean;
  /** 큐레이터 프로토타입 표시 여부(ENABLE_CURATOR_PROTOTYPE 또는 관리자·로컬 미리보기) — 상단 메뉴에는 쓰지 않는다 */
  curators?: boolean;
}

// 페이지 이동마다 다시 묻지 않도록 탭 단위로 한 번만 조회한다(로그인/로그아웃은 전체 리로드를 동반).
// layout에서 auth()를 부르면 QR 진입(/c/[code]) 등 모든 페이지 렌더에 세션 조회가 더해지므로,
// 상단 메뉴 · 하단 탭은 화면이 뜬 뒤 /api/site/viewer로 늦게 가져온다.
let viewerPromise: Promise<SiteViewer | null> | null = null;
function fetchViewer(): Promise<SiteViewer | null> {
  if (!viewerPromise) {
    viewerPromise = fetch("/api/site/viewer", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SiteViewer>) : null))
      .catch(() => null);
  }
  return viewerPromise;
}

/** 로그인 · 관리자 · 에디토리얼 공개 여부(조회 전에는 null). enabled=false면 조회하지 않는다. */
export function useSiteViewer(enabled = true): SiteViewer | null {
  const [viewer, setViewer] = useState<SiteViewer | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchViewer().then((v) => {
      if (alive) setViewer(v);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return viewer;
}
