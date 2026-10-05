"use client";

import { useEffect } from "react";

/* ── 상세 글은 링크로 들어오면 항상 맨 위에서 연다 ──────────────────────────────
   상세 → 상세 클라이언트 이동에서 Next.js가 이전 스크롤 위치를 그대로 두는 경우가 있다(loading.tsx 단계에서
   문서가 짧아졌다가 본문이 오면 예전 위치로 돌아간다). 그래서 상세 글이 마운트될 때 직전 이동이 "링크 클릭"이면
   맨 위로 올린다.
   - 새로고침 · 첫 진입: 이동 기록이 없으므로 건드리지 않는다(브라우저 복원 유지).
   - 뒤로/앞으로(popstate): 읽던 위치 복원이 맞으므로 건드리지 않는다.
   마지막 이동 종류는 모듈 수준에서 한 번만 듣는다(문서당 리스너 2개, 페이지 이동마다 누적되지 않음). ── */

let lastNavigation: "none" | "link" | "history" = "none";

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

export function useOpenAtTop(pathname: string) {
  useEffect(() => {
    if (lastNavigation === "link") window.scrollTo(0, 0);
    lastNavigation = "none";
  }, [pathname]);
}
