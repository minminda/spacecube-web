/* ── 시연용 공개 가상 공간(EditorialSpace, isDemo=true + slug 접두어 "demo-") 판정 · 필터 ───────────────────────
   기존 isDemo 정책(공개 목록 · 검색 · 추천 · KPI에서 제외)은 그대로이고, "시연용 공개 가상 공간"만 일반 사용자의 Discovery 경로
   (HOME · 검색 · 상세 · 저장 · 내 공간 · 방문 기록 · 개인화 후보)에 열어 준다. 출처 표시는 isDemo=true + 접두어 두 가지다 —
   접두어가 없는 isDemo 공간(큐레이터 프로토타입 proto-* 등)은 계속 관리자 · 로컬 미리보기에서만 보인다.
   KPI(Discovery KPI · 관리자 합계 · 월간 리포트)는 isDemo=false만 세므로 시연 공간 활동은 자동으로 빠진다. ENABLE_PUBLIC_DEMO_SPACES가 꺼지면 모두 닫힌다. ── */

import type { Prisma } from "@prisma/client";
import { ENABLE_PUBLIC_DEMO_SPACES } from "@/lib/features";

export const DEMO_SPACE_SLUG_PREFIX = "demo-";
/** 시연 컬렉션에 더한 "실제 장소의 일반 공간"(Partner 아님 · Cube/Episode 없음). 접두어가 "demo-"로 시작하므로 같은 공개 경로를 쓰고, 화면 문구만 가상 공간과 다르다. */
export const EXTENDED_SPACE_SLUG_PREFIX = "demo-ext-";

/** 일반 사용자에게 열어 준 시연용 공개 가상 공간인가 */
export function isPublicDemoSpace(sp: { isDemo: boolean; slug: string }): boolean {
  return ENABLE_PUBLIC_DEMO_SPACES && sp.isDemo && sp.slug.startsWith(DEMO_SPACE_SLUG_PREFIX);
}

/** 시연 컬렉션용 확장 공간(실제 장소 · Partner 아님)인가 — 가상 공간과 문구를 구분할 때 쓴다 */
export function isExtendedSpace(slug: string | null | undefined): boolean {
  return !!slug && slug.startsWith(EXTENDED_SPACE_SLUG_PREFIX);
}

/** 카드의 작은 출처 표시 — 가상 공간은 "시연용 공간", 실제 장소를 더한 확장 공간은 "시연 컬렉션" */
export function demoBadge(slug: string | null | undefined): string {
  return isExtendedSpace(slug) ? "시연 컬렉션" : "시연용 공간";
}

/** 일반 사용자 화면에서 쓸 수 있는 공간인가 — 실제 공간이거나 시연용 공개 가상 공간 */
export function spaceUsable(sp: { isDemo: boolean; slug: string }): boolean {
  return !sp.isDemo || isPublicDemoSpace(sp);
}

/** EditorialSpace where 조각 — 실제 공간 + (켜져 있으면) 시연용 공개 가상 공간. 기존 `{ isDemo: false }` 자리에 쓴다. */
export function publicSpaceFilter(): Prisma.EditorialSpaceWhereInput {
  return ENABLE_PUBLIC_DEMO_SPACES
    ? { OR: [{ isDemo: false }, { isDemo: true, slug: { startsWith: DEMO_SPACE_SLUG_PREFIX } }] }
    : { isDemo: false };
}
