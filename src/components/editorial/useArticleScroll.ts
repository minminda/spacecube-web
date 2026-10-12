"use client";

import { useEffect } from "react";

/* ── 상세 글 스크롤 위치 ──────────────────────────────────────────────────────
   - 링크로 들어오면 맨 위에서 연다: 상세 → 상세 클라이언트 이동에서 Next.js가 loading.tsx 단계 뒤 이전 위치로
     돌아가는 경우가 있다.
   - 새로고침은 모든 화면 공통으로 맨 위(src/lib/reloadScroll.ts — 브라우저 복원 자체를 건너뜀). 2026-10-12 이전에는 읽던 위치를
     sessionStorage로 복원했지만 "새로 불러오면 맨 위" 원칙으로 바꿨다.
   - 뒤로/앞으로(popstate)는 기존 복원이 정확하므로 건드리지 않는다.
   이동 종류 감지는 모듈 수준에서 한 번만 듣는다(Navbar가 미리 불러 목록 → 상세 첫 이동에도 동작). ── */

let lastNavigation: "initial" | "link" | "history" | "done" = "initial";

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

export function useArticleScroll(pathname: string) {
  useEffect(() => {
    const nav = lastNavigation;
    lastNavigation = "done";
    if (nav === "link") window.scrollTo(0, 0);
  }, [pathname]);
}
