/* ── 시연·테스트 데이터 제외 정책 (비파괴) ─────────────────────────────────
   발표·시연용으로 만든 공간/더미 계정/기록/방명록을 물리적으로 지우지 않고, 실제 서비스
   화면과 지표에서만 일관되게 빼기 위한 공통 필터. 플래그는 두 개뿐이다.

   - Space.isDemo: 시연·테스트 공간. QR·직접 링크로는 그대로 열린다(시연 가능). 대신
     공개 목록·검색·추천 후보·추천 취향 신호·여러 공간을 합친 KPI에서 빠진다.
     isActive=false(완전 비공개, QR도 막힘)와는 독립된 별개의 축이다.
   - User.isDemo: 더미 계정. KPI 집계·다른 사용자 목록에서 빠지고, 이 계정의 방명록
     흔적은 시연 공간 안에서만 보인다(실제 공간으로 되돌려도 더미 흔적이 섞이지 않음).

   방명록 샘플(빈 방명록을 채우는 표시용 글, scripts/seed-sample-guestbook.ts)만 예외적으로 방문자 화면에 보인다 —
     샘플 전용 더미 계정 하나(SAMPLE_GUESTBOOK_AUTHOR_EMAIL, User.isDemo)가 쓴 글이라 DB에서 언제든 구분되고,
     방문자 방명록 캔버스 · 이전 방명록에서만 일반 글과 똑같이 보인다(guestbookVisibleAuthorFilter, 표시 없음).
     운영자 화면 · 포스트잇 수 · KPI · 리포트 · 퍼널 · 추천 · 공개 프로필에서는 그대로 빠지고, 관리자 목록에만 SAMPLE로 구분된다.
     다른 더미 계정(시연용 사람 등)의 글은 지금처럼 실제 공간 방문자 화면에 보이지 않는다.

   Record·GuestbookNote·GuestbookReaction에는 별도 플래그를 두지 않는다 — "어느 공간에서,
   누가" 만든 데이터인지(위 두 플래그)로 파생된다. Tag는 기존 Tag.isActive(소프트 비활성)를
   그대로 쓴다. 관리자 /admin/demo-data에서 두 플래그를 언제든 되돌릴 수 있다.
──────────────────────────────────────────────────────────────────────── */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserIds } from "@/lib/kpiEligibility";
import { SAMPLE_GUESTBOOK_AUTHOR_EMAIL } from "@/lib/sampleGuestbookAuthor";

/** 일반 사용자에게 "목록"으로 노출해도 되는 공간 — 공개 중이고 시연 공간이 아님. */
export const LISTED_SPACE_WHERE = { isActive: true, isDemo: false } satisfies Prisma.SpaceWhereInput;

/** 추천 취향 신호로 쓸 방문 기록 — 시연 공간에서 남긴 기록은 취향 벡터에 넣지 않는다. */
export const TASTE_SIGNAL_RECORD_WHERE = { space: { isDemo: false } } satisfies Prisma.RecordWhereInput;

/**
 * 방문자 화면에서 방명록 글을 보여줄 때의 더미 계정 필터.
 * 시연 공간이면 더미 흔적도 시연의 일부이므로 그대로 보여주고, 실제 공간이면 더미 계정의
 * 글을 뺀다. 비로그인 글(userId null)은 `user` 관계 필터만 쓰면 함께 빠지므로 OR로 살린다.
 */
export function guestbookAuthorFilter(spaceIsDemo: boolean): Prisma.GuestbookNoteWhereInput {
  if (spaceIsDemo) return {};
  return { OR: [{ userId: null }, { user: { isDemo: false } }] };
}

export { SAMPLE_GUESTBOOK_AUTHOR_EMAIL };

/**
 * 방문자 방명록 화면(캔버스 · 이전 방명록 · 작성 시 자리 피하기)에 보일 글의 작성자 필터.
 * guestbookAuthorFilter에 방명록 샘플 계정 글만 더한다 — 샘플은 화면을 채우는 표시용이라 일반 방문자에게도 보이지만,
 * 다른 더미 계정 글은 여전히 실제 공간에서 빠진다. 집계 · 운영자 화면에는 쓰지 않는다(REAL_GUESTBOOK_NOTE_WHERE / getKpiExcludedUserIds).
 */
export function guestbookVisibleAuthorFilter(spaceIsDemo: boolean): Prisma.GuestbookNoteWhereInput {
  if (spaceIsDemo) return {};
  return { OR: [{ userId: null }, { user: { isDemo: false } }, { user: { isDemo: true, email: SAMPLE_GUESTBOOK_AUTHOR_EMAIL } }] };
}

/**
 * 방명록 캔버스에 (샘플 외) 다른 더미 계정 글까지 섞어 볼 수 있는가 — 관리자 또는 로컬 개발만(previewDemoUsers와 같은 기준).
 * 운영의 일반 방문자에게는 실제 공간에서 방명록 샘플 계정 외의 더미 글이 보이지 않는다.
 */
export function previewGuestbookSamples(admin: boolean): boolean {
  return admin || process.env.NODE_ENV === "development";
}

/** 실제 방문자 글만(KPI 밖 집계 · 운영자 화면용) — 실제 공간이면 더미 계정 글(샘플 포함)을 뺀다. 시연 공간은 그대로. space.isDemo를 몰라도 쓸 수 있는 형태. */
export const REAL_GUESTBOOK_NOTE_WHERE = { OR: [{ userId: null }, { user: { isDemo: false } }, { space: { isDemo: true } }] } satisfies Prisma.GuestbookNoteWhereInput;

/** 더미 계정 User.id 집합. */
export async function getDemoUserIds(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({ where: { isDemo: true }, select: { id: true } });
  return new Set(rows.map((u) => u.id));
}

/**
 * KPI 집계에서 제외할 User.id — 관리자(검수 행동) ∪ 더미 계정(시연 데이터).
 * 기존 getAdminUserIds()를 쓰던 집계 쿼리는 전부 이 함수로 바꿔, 두 종류의 "실제 방문자가
 * 아닌 행동"을 한 곳에서 같은 방식(`userId: { notIn }`)으로 뺀다.
 */
export async function getKpiExcludedUserIds(): Promise<Set<string>> {
  const [admins, demos] = await Promise.all([getAdminUserIds(), getDemoUserIds()]);
  return new Set([...admins, ...demos]);
}

/**
 * 더미 계정(User.isDemo)을 사람 추천 · 공개 프로필 · 취향 따라가기에서 볼 수 있는가 — 관리자 또는 로컬 개발만.
 * 운영의 일반 방문자에게는 어떤 경우에도 더미 계정이 보이지 않는다(큐레이터 프로토타입의 includeDemo와 같은 원칙).
 */
export function previewDemoUsers(admin: boolean): boolean {
  return admin || process.env.NODE_ENV === "development";
}
