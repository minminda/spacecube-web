/* ── 큐레이터 프로토타입 접근 판정 ─────────────────────────────────────────
   enabled: 큐레이터 화면을 볼 수 있는가. includeDemo: 가상 큐레이터·가상 공간(isDemo)까지 볼 수 있는가.
   가상 데이터는 플래그와 무관하게 관리자·로컬 개발에서만 — 일반 방문자에게는 어떤 경우에도 내려가지 않는다. ── */

import { ENABLE_CURATOR_PROTOTYPE } from "@/lib/features";

export interface CuratorAccess {
  enabled: boolean;
  includeDemo: boolean;
}

export function curatorAccess(viewer: { admin: boolean; editorial: boolean }): CuratorAccess {
  const preview = viewer.admin || process.env.NODE_ENV === "development";
  return {
    enabled: viewer.editorial && (ENABLE_CURATOR_PROTOTYPE || preview),
    includeDemo: preview,
  };
}
