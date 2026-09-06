/**
 * 한이음 공모전 시연 영상 촬영용 — 관리자(admin) 계정 전용 데모 오버라이드를 한 곳에 모아 관리한다.
 *
 * 적용 범위: isAdmin(email)이 true인 계정에만 적용된다. 일반 사용자의 취향 추천 알고리즘,
 * Episode 잠금 정책(unlockVisitCount), 방문 기록(Record) 로직은 전혀 건드리지 않는다 —
 * 이 모듈이 참조되는 지점(archive/taste, archive/taste/all, space/[slug])에서 UI/조회 결과에만
 * 조건부로 개입한다. DB 데이터(Space/Episode)는 변경하지 않는다.
 *
 * 여러 페이지에 동일한 slug를 중복 하드코딩하지 않도록 이 파일 하나만 참조한다. 촬영이
 * 끝나면 각 참조부의 `demo` 분기를 제거하거나 이 파일을 지우면 원상복구된다.
 */
import { isAdmin } from "./admin";

/** 관리자 계정의 '내 취향' TOP3로 고정 노출할 공간 slug — 이 순서 그대로 1/2/3위에 노출한다. */
export const ADMIN_DEMO_TOP3_SLUGS = ["nokhwabutton", "turndown-service", "dasijeom"] as const;

/** 관리자 계정에서 EP.1 열람이 가능해야 하는 공간(시연 시나리오상 이미 다녀온 곳) — 그 외 활성 공간은 EP.1을 잠금 상태로 보여준다. */
export const ADMIN_DEMO_UNLOCKED_SLUGS = ["aka-coffee-room", "buk"] as const;

/** 이 세션이 관리자 데모 오버라이드 대상인지 — isAdmin()을 그대로 재사용한다(별도 판별 기준 없음). */
export function isAdminDemoSession(email: string | null | undefined): boolean {
  return isAdmin(email);
}

/** 이 공간이 관리자 데모에서 EP.1을 정상적으로 보여줘야 하는 공간인지. */
export function isAdminDemoUnlockedSpace(slug: string): boolean {
  return (ADMIN_DEMO_UNLOCKED_SLUGS as readonly string[]).includes(slug);
}
