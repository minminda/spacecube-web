/* ── 방명록 퍼널 계측 ────────────────────────────────────────────────
   "Story를 본 사용자가 방명록까지 얼마나 이동하고, 로그인 때문에 얼마나 이탈하는가"를 보기
   위한 최소 계측. 실제 코드를 조사해보니 방명록 "열람" 자체가 이미 로그인 + 취향 점수
   (Record) 저장을 전제로 한다(guestbook/page.tsx의 unlocked는 user가 있을 때만 계산됨) —
   Episode 페이지처럼 QR 쿠키만으로 여는 비로그인 분기가 없다. 이 게이트는 의도된 설계로
   보여(취향 점수를 남겨야 방명록이 열리는 리워드 구조) 건드리지 않기로 했다(사용자 확인 완료).

   그래서 "Guestbook View"를 문자 그대로(캔버스가 실제로 렌더된 순간)로 잡으면 비로그인
   방문자는 구조적으로 절대 잡히지 않는다. 대신 로그인/비로그인 모두에게 실제로 관측 가능한
   가장 이른 지점 — "방명록 열기" CTA를 눌러 record/guestbook 방향으로 이동을 시도한 순간 —
   을 ENTRY_ATTEMPT로 잡는다. 비로그인은 이 이동이 즉시 /login으로 리다이렉트되므로,
   ENTRY_ATTEMPT와 LOGIN_REQUIRED가 같은 지점(로그인 페이지 렌더 시점)에서 함께 기록된다.

   userId/anonId 이중 nullable + 이중 유니크 구조는 EpisodeRead와 완전히 동일(anonVisitor.ts의
   sc_anon_id 쿠키를 그대로 재사용, 새 익명 식별자를 만들지 않는다). 스텝별로 방문자당 최초
   1회만 기록해 "몇 번 눌렀는지"가 아니라 "몇 명이 그 단계까지 왔는지"를 센다 — 새로고침/반복
   클릭으로 무한 증가하지 않는다. ── */

import { prisma } from "@/lib/prisma";
import { GuestbookFunnelStep } from "@prisma/client";

/** 스텝을 1회만 기록한다(userId/anonId 중 있는 쪽 기준). 계측 실패가 실제 방문 흐름을
 *  막으면 안 되므로 항상 조용히 무시한다. */
export async function recordGuestbookFunnelStep(params: {
  spaceId: string;
  step: GuestbookFunnelStep;
  userId?: string | null;
  anonId?: string | null;
}): Promise<void> {
  const { spaceId, step, userId, anonId } = params;
  try {
    if (userId) {
      await prisma.guestbookFunnelEvent.upsert({
        where: { userId_spaceId_step: { userId, spaceId, step } },
        create: { spaceId, step, userId },
        update: {},
      });
    } else if (anonId) {
      await prisma.guestbookFunnelEvent.upsert({
        where: { anonId_spaceId_step: { anonId, spaceId, step } },
        create: { spaceId, step, anonId },
        update: {},
      });
    }
  } catch {
    /* 계측 실패가 실제 흐름을 막으면 안 된다 */
  }
}

/** 이 anonId가 이 공간에서 LOGIN_REQUIRED를 겪은 적이 있으면(=지금 로그인한 게 방명록 흐름을
 *  타다 발생한 로그인일 가능성이 높으면) LOGIN_SUCCESS를 userId로 기록한다. 일반적인 사이트
 *  로그인(예: 이미 로그인된 채로 재방문)과 구분하기 위해, 해당 anonId의 LOGIN_REQUIRED 행이
 *  실제로 존재할 때만 기록한다 — 새 인증 시스템이나 콜백 파라미터를 추가하지 않고 이미 있는
 *  sc_anon_id 쿠키(로그인해도 그대로 남아있음)만으로 두 시점을 연결한다. */
export async function recordGuestbookLoginSuccessIfPending(
  spaceId: string,
  userId: string,
  anonId: string | null,
): Promise<void> {
  if (!anonId) return;
  try {
    const pending = await prisma.guestbookFunnelEvent.findUnique({
      where: { anonId_spaceId_step: { anonId, spaceId, step: GuestbookFunnelStep.LOGIN_REQUIRED } },
      select: { id: true },
    });
    if (!pending) return;
  } catch {
    return;
  }
  await recordGuestbookFunnelStep({ spaceId, step: GuestbookFunnelStep.LOGIN_SUCCESS, userId });
}

/** "/login?callbackUrl=..."의 목적지가 방명록/기록 흐름으로 이어지는 경로인지 판정하는
 *  순수 함수 — login/page.tsx가 계측 여부와 문구 분기에 함께 재사용한다. */
export function isGuestbookFunnelCallback(path: string | null | undefined): boolean {
  if (!path) return false;
  return /^\/space\/[^/]+\/(record|guestbook)(?:[/?]|$)/.test(path);
}

/** 위 경로에서 공간 slug만 뽑아낸다(경로 형식이 아니면 null). */
export function extractSpaceSlugFromGuestbookCallback(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = /^\/space\/([^/]+)\/(?:record|guestbook)(?:[/?]|$)/.exec(path);
  return match ? match[1] : null;
}
