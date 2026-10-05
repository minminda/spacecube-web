"use client";

import { useEffect } from "react";

/* ── 상세 글 스크롤 위치 ──────────────────────────────────────────────────────
   - 링크로 들어오면 맨 위에서 연다: 상세 → 상세 클라이언트 이동에서 Next.js가 loading.tsx 단계 뒤 이전 위치로
     돌아가는 경우가 있다.
   - 새로고침하면 읽던 위치를 정확히 복원한다: 브라우저 기본 복원은 스트리밍 중(로딩 화면이라 문서가 짧을 때)
     일어나 위치가 잘린다. 그래서 떠날 때(pagehide) 글 위치를 sessionStorage에 남기고, 새로고침으로 다시 열린 글이
     마운트되면(본문이 다 그려진 뒤) 그 위치로 보낸다.
   - 뒤로/앞으로(popstate)는 기존 복원이 정확하므로 건드리지 않는다.
   이동 종류 감지는 모듈 수준에서 한 번만 듣는다(Navbar가 미리 불러 목록 → 상세 첫 이동에도 동작). ── */

const KEY = "sc-article-scroll:";

let lastNavigation: "initial" | "link" | "history" | "done" = "initial";

function isReload(): boolean {
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

if (typeof window !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      if ((e.target as Element | null)?.closest?.("a[href]")) lastNavigation = "link";
    },
    true,
  );
  window.addEventListener("popstate", () => {
    lastNavigation = "history";
  });
}

function readSaved(path: string): number | null {
  try {
    const v = Number(sessionStorage.getItem(KEY + path));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function useArticleScroll(pathname: string) {
  useEffect(() => {
    const nav = lastNavigation;
    lastNavigation = "done";
    if (nav === "link") {
      window.scrollTo(0, 0);
    } else if (nav === "initial" && isReload()) {
      const y = readSaved(pathname);
      if (y !== null) window.scrollTo(0, y);
    }

    const save = () => {
      try {
        sessionStorage.setItem(KEY + pathname, String(Math.round(window.scrollY)));
      } catch {
        /* 저장소를 못 쓰면 복원만 포기 */
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [pathname]);
}
