/* ── 공간 이야기 열람 권한(SpaceUnlock) ──────────────────────────
   공간의 Episode/Scene/방명록은 취향 점수를 저장한 Record가 아니라, 해당 공간에 연결된
   유효한 Cube QR을 실제로 인식했을 때만 열린다. 카드 클릭·URL 직접 접근·?unlocked=true
   같은 클라이언트 파라미터만으로는 절대 해제되지 않는다 — 이 파일의 함수들이 모든 보호
   페이지·API가 공유하는 유일한 서버측 판정 지점이다. ──────────────────────────── */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/** 스캔 직후 아직 로그인 전인 사용자를 위한 임시 서명 쿠키 — 로그인 완료 후 이어서 Unlock을 부여하는 데만 쓴다. */
export const PENDING_UNLOCK_COOKIE = "sc_pending_unlock";
/** 쿠키 유효 시간(초) — "스캔 → 그 자리에서 로그인"을 이어주는 용도라 짧게 잡는다. */
export const PENDING_UNLOCK_MAX_AGE_SECONDS = 30 * 60;

interface PendingUnlockPayload {
  cubeCode: string;
  spaceId: string;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — pending unlock token을 서명할 수 없습니다.");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** cubeCode/spaceId를 서버 서명이 붙은 토큰으로 인코딩한다(위변조 불가, 짧은 만료시간). */
export function createPendingUnlockToken(cubeCode: string, spaceId: string): string {
  const payload: PendingUnlockPayload = {
    cubeCode,
    spaceId,
    exp: Date.now() + PENDING_UNLOCK_MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** 서명·만료를 검증하고 payload를 반환한다. 조작되었거나 만료된 토큰은 null. */
export function verifyPendingUnlockToken(token: string | undefined | null): PendingUnlockPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<PendingUnlockPayload>;
    if (
      typeof payload.cubeCode !== "string" ||
      typeof payload.spaceId !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() > payload.exp
    ) {
      return null;
    }
    return payload as PendingUnlockPayload;
  } catch {
    return null;
  }
}

/** 이미 해당 사용자·공간의 Unlock이 존재하는지만 확인한다(쿠키 폴백 없음). */
export async function hasSpaceUnlock(userId: string, spaceId: string): Promise<boolean> {
  const unlock = await prisma.spaceUnlock.findUnique({
    where: { userId_spaceId: { userId, spaceId } },
    select: { id: true },
  });
  return !!unlock;
}

/**
 * Unlock을 부여(또는 갱신)한다 — 같은 사용자·공간 조합은 유일하므로 재스캔해도 새 행을
 * 만들지 않고 unlockedAt/cubeId만 최신화한다.
 */
export async function grantSpaceUnlock(userId: string, spaceId: string, cubeId: string | null): Promise<void> {
  await prisma.spaceUnlock.upsert({
    where: { userId_spaceId: { userId, spaceId } },
    update: { unlockedAt: new Date(), ...(cubeId ? { cubeId } : {}) },
    create: { userId, spaceId, cubeId, unlockedAt: new Date() },
  });
}

/**
 * 로그인 전에 QR을 스캔했던 사용자가 로그인 완료 후 이 공간의 보호 페이지에 처음 도달했을 때,
 * 남아 있는 pending-unlock 쿠키를 검증해 Unlock으로 전환한다. 쿠키의 스냅샷을 그대로 믿지 않고
 * "지금 이 순간"에도 해당 큐브가 이 공간에 정상(ASSIGNED)으로 연결돼 있는지 다시 확인한다 —
 * 그 사이 비활성화되거나 다른 공간으로 재연결됐으면 거부한다.
 */
async function consumePendingUnlockCookie(userId: string, spaceId: string): Promise<boolean> {
  const store = await cookies();
  const payload = verifyPendingUnlockToken(store.get(PENDING_UNLOCK_COOKIE)?.value);
  if (!payload || payload.spaceId !== spaceId) return false;

  const cube = await prisma.cube.findUnique({
    where: { code: payload.cubeCode },
    select: { id: true, status: true, spaceId: true },
  });
  if (!cube || cube.status !== "ASSIGNED" || cube.spaceId !== spaceId) return false;

  await grantSpaceUnlock(userId, spaceId, cube.id);
  return true;
}

/**
 * 모든 보호 페이지·API가 공유하는 단일 판정 함수. 이미 Unlock이 있으면 즉시 true, 없으면
 * pending-unlock 쿠키로 방금 로그인한 스캔을 이어서 확정할 수 있는지 시도한다. 관리자·운영자
 * 예외는 이 함수의 책임이 아니다 — 호출부가 isAdmin/canAccessSpace와 함께 조합해서 쓴다.
 */
export async function requireSpaceUnlock(userId: string, spaceId: string): Promise<boolean> {
  if (await hasSpaceUnlock(userId, spaceId)) return true;
  return consumePendingUnlockCookie(userId, spaceId);
}
