/* ── 공간 이야기 열람 권한(SpaceUnlock) ──────────────────────────
   공간의 Episode/Scene/방명록은 취향 점수를 저장한 Record가 아니라, 해당 공간에 연결된
   유효한 Cube QR을 실제로 인식했을 때만 열린다. 카드 클릭·URL 직접 접근·?unlocked=true
   같은 클라이언트 파라미터만으로는 절대 해제되지 않는다 — 이 파일의 함수들이 모든 보호
   페이지·API가 공유하는 유일한 서버측 판정 지점이다.

   중요: "QR 스캔"과 "로그인"은 서로 다른 축이다. 공간 이야기를 읽는 데는 로그인이 필요
   없다 — 유효한 QR 스캔(서명된 QR_ACCESS_COOKIE, 12시간)만 있으면 비회원도 열람할 수
   있다. 로그인은 오직 "쓰기"(취향 점수 저장, 방명록 작성 등 src/app/space/[slug]/record,
   /guestbook의 작성 흐름)에만 필요하다 — 그 페이지들은 이 파일이 아니라 각자 auth() 세션
   자체를 요구한다. 로그인한 사용자는 SpaceUnlock DB 행(영구 기록, 12시간 만료)으로,
   비로그인 사용자는 그 자리에서 계속 QR_ACCESS_COOKIE로 판정한다 — 로그인하는 순간
   claimQrAccessForUser가 쿠키를 SpaceUnlock 행으로 승격시켜 이어서 durable하게 만든다.

   접근 권한은 마지막 스캔으로부터 12시간 동안만 유효하다(isSpaceUnlockActive, 로그인
   사용자·비로그인 쿠키 공통 정책값 REVISIT_INTERVAL_HOURS). 12시간이 지나면 공간은 다시
   잠기고, 재스캔하면 다시 12시간 열린다. 이 만료는 접근 권한에만 적용되고, Episode 잠금
   해제 자체(방문 횟수 기반, unlockVisitCount<=visitCount)는 Record 누적 개수로 판정되어
   영구 유지된다 — 서로 다른 데이터로 관리되며, 공간이 재잠금돼도 Episode Unlock 여부는
   초기화되지 않는다. (Record는 로그인 사용자만 남길 수 있으므로, 비로그인 방문자는
   자연스럽게 unlockVisitCount=0인 첫 이야기까지만 보인다 — 별도 분기 불필요.) ── */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isNewVisit, REVISIT_INTERVAL_HOURS } from "@/lib/visit";

/** QR 스캔 인증 쿠키 — 로그인 여부와 무관하게 "이 브라우저가 유효한 큐브 QR을 스캔했다"는
 * 서명된 증거. 비로그인 방문자의 열람 권한 판정 자체(hasAnonymousSpaceAccess)에 쓰이고,
 * 로그인하면 claimQrAccessForUser가 이걸 SpaceUnlock DB 행으로 승격시킨다. */
export const QR_ACCESS_COOKIE = "sc_qr_access";
/** 쿠키 유효 시간(초) — 로그인 사용자의 SpaceUnlock 만료(REVISIT_INTERVAL_HOURS)와 동일하게 맞춘다. */
export const QR_ACCESS_COOKIE_MAX_AGE_SECONDS = REVISIT_INTERVAL_HOURS * 60 * 60;

interface QrAccessPayload {
  cubeCode: string;
  spaceId: string;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — QR access token을 서명할 수 없습니다.");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** cubeCode/spaceId를 서버 서명이 붙은 토큰으로 인코딩한다(위변조 불가). */
export function createQrAccessToken(cubeCode: string, spaceId: string): string {
  const payload: QrAccessPayload = {
    cubeCode,
    spaceId,
    exp: Date.now() + QR_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** 서명·만료를 검증하고 payload를 반환한다. 조작되었거나 만료된 토큰은 null. */
export function verifyQrAccessToken(token: string | undefined | null): QrAccessPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<QrAccessPayload>;
    if (
      typeof payload.cubeCode !== "string" ||
      typeof payload.spaceId !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() > payload.exp
    ) {
      return null;
    }
    return payload as QrAccessPayload;
  } catch {
    return null;
  }
}

/** 이 Unlock이 아직 유효한지(마지막 스캔으로부터 12시간 이내) 판정하는 순수 함수 —
 * 재방문 인정 간격(isNewVisit, REVISIT_INTERVAL_HOURS)과 동일한 정책값을 재사용한다.
 * "아직 새 방문으로 인정될 시점이 아니다" = "그 스캔으로 열린 접근이 아직 살아있다". */
export function isSpaceUnlockActive(unlockedAt: Date, now: Date = new Date()): boolean {
  return !isNewVisit(unlockedAt, now);
}

/** 이미 해당 사용자·공간의 Unlock이 존재하고, 마지막 스캔으로부터 12시간이 지나지 않았는지 확인한다(쿠키 폴백 없음). */
export async function hasSpaceUnlock(userId: string, spaceId: string): Promise<boolean> {
  const unlock = await prisma.spaceUnlock.findUnique({
    where: { userId_spaceId: { userId, spaceId } },
    select: { unlockedAt: true },
  });
  return !!unlock && isSpaceUnlockActive(unlock.unlockedAt);
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

/** QR_ACCESS_COOKIE의 cubeCode가 지금도 이 spaceId에 정상(ASSIGNED)으로 연결돼 있는지
 * 재확인한다 — 쿠키의 스냅샷을 그대로 믿지 않고, 그 사이 비활성화되거나 다른 공간으로
 * 재연결됐으면 거부한다(claimQrAccessForUser/hasAnonymousSpaceAccess 공용). */
async function verifyQrAccessCube(payload: QrAccessPayload, spaceId: string): Promise<{ id: string } | null> {
  if (payload.spaceId !== spaceId) return null;
  const cube = await prisma.cube.findUnique({
    where: { code: payload.cubeCode },
    select: { id: true, status: true, spaceId: true },
  });
  if (!cube || cube.status !== "ASSIGNED" || cube.spaceId !== spaceId) return null;
  return { id: cube.id };
}

/**
 * 비로그인 방문자용 — DB에 아무것도 쓰지 않고, 이 브라우저의 QR_ACCESS_COOKIE만으로
 * "지금 이 공간을 읽어도 되는지" 판정한다. 로그인 사용자의 SpaceUnlock과 달리 User와
 * 연결하지 않는다(익명 방문 그대로 허용) — 공간 접근 자체를 로그인 여부로 막지 않기 위함.
 */
export async function hasAnonymousSpaceAccess(spaceId: string): Promise<boolean> {
  const debug = process.env.NODE_ENV !== "production";
  const store = await cookies();
  const payload = verifyQrAccessToken(store.get(QR_ACCESS_COOKIE)?.value);
  if (!payload) {
    if (debug) console.log(`[spaceUnlock] QR access 쿠키 없음/만료 — 비로그인 접근 거부 (spaceId=${spaceId})`);
    return false;
  }
  const cube = await verifyQrAccessCube(payload, spaceId);
  if (debug) console.log(`[spaceUnlock] 비로그인 접근 판정 결과=${!!cube} (spaceId=${spaceId})`);
  return !!cube;
}

/**
 * 로그인 전에 QR을 스캔했던 사용자가 로그인 완료 후 이 공간의 보호 페이지에 처음 도달했을 때,
 * 남아 있는 QR_ACCESS_COOKIE를 검증해 durable한 SpaceUnlock 행으로 승격시킨다(그 뒤로는
 * 쿠키가 만료돼도 로그인 사용자 자격으로 계속 유효). "지금 이 순간"에도 해당 큐브가 이
 * 공간에 정상(ASSIGNED)으로 연결돼 있는지 다시 확인한 뒤에만 승격한다.
 */
async function claimQrAccessForUser(userId: string, spaceId: string): Promise<boolean> {
  const debug = process.env.NODE_ENV !== "production";
  const store = await cookies();
  const payload = verifyQrAccessToken(store.get(QR_ACCESS_COOKIE)?.value);
  if (!payload) {
    if (debug) console.log(`[spaceUnlock] QR access 쿠키 없음/만료 — 로그인 사용자 승격 안 함 (spaceId=${spaceId})`);
    return false;
  }
  const cube = await verifyQrAccessCube(payload, spaceId);
  if (!cube) {
    if (debug) console.log(`[spaceUnlock] QR access 쿠키는 있으나 큐브 상태가 그 사이 바뀜 — 승격 안 함`);
    return false;
  }

  await grantSpaceUnlock(userId, spaceId, cube.id);
  if (debug) console.log(`[spaceUnlock] QR access 쿠키 승격 완료 — SpaceUnlock 확정(userId=${userId}, spaceId=${spaceId})`);
  return true;
}

/**
 * 로그인 사용자 전용 판정 함수. 이미 SpaceUnlock이 있으면 즉시 true, 없으면 QR_ACCESS_COOKIE로
 * 방금 로그인한 스캔을 이어서 확정할 수 있는지 시도한다. 관리자·운영자 예외는 이 함수의
 * 책임이 아니다 — 호출부가 isAdmin/canAccessSpace와 함께 조합해서 쓴다. 비로그인 방문자의
 * 판정은 hasAnonymousSpaceAccess를 따로 쓴다(resolveSpaceAccess가 둘을 합쳐준다).
 */
export async function requireSpaceUnlock(userId: string, spaceId: string): Promise<boolean> {
  if (await hasSpaceUnlock(userId, spaceId)) return true;
  return claimQrAccessForUser(userId, spaceId);
}

/**
 * 공간 "읽기" 보호 페이지(공간 상세, Episode 상세 등)가 공통으로 쓰는 단일 진입점 —
 * 로그인 여부에 따라 requireSpaceUnlock/hasAnonymousSpaceAccess로 자동 분기한다.
 * "쓰기"(기록 작성, 방명록 작성)는 이 함수를 쓰지 않고 각 페이지가 로그인 자체를 강제한 뒤
 * requireSpaceUnlock을 직접 호출한다 — 쓰기는 로그인 없이는 애초에 진입할 수 없기 때문이다.
 */
export async function resolveSpaceAccess(params: { userId: string | null; spaceId: string; isBypass: boolean }): Promise<boolean> {
  if (params.isBypass) return true;
  if (params.userId) return requireSpaceUnlock(params.userId, params.spaceId);
  return hasAnonymousSpaceAccess(params.spaceId);
}

export interface SpaceUnlockRow {
  spaceId: string;
  unlockedAt: Date;
}

/**
 * 순수 함수 — 이미 가져온 SpaceUnlock 행 목록에서 "지금 유효한" 공간 집합과 "만료 여부와
 * 무관하게 한 번이라도 열린" 공간 집합을 동시에 계산한다. discover 페이지와 추천 카드 등
 * 여러 화면에서 같은 다중-공간 잠금 판정을 각자 인라인으로 중복 구현하지 않도록 여기 한
 * 곳에 모았다.
 */
export function computeUnlockSets(rows: SpaceUnlockRow[], now: Date = new Date()): { unlocked: Set<string>; everUnlocked: Set<string> } {
  const everUnlocked = new Set(rows.map((r) => r.spaceId));
  const unlocked = new Set(rows.filter((r) => isSpaceUnlockActive(r.unlockedAt, now)).map((r) => r.spaceId));
  return { unlocked, everUnlocked };
}

/** 얇은 DB 래퍼 — 이 사용자의 전체 SpaceUnlock 행을 가져와 computeUnlockSets로 계산한다. */
export async function getUserUnlockSets(userId: string): Promise<{ unlocked: Set<string>; everUnlocked: Set<string> }> {
  const rows = await prisma.spaceUnlock.findMany({ where: { userId }, select: { spaceId: true, unlockedAt: true } });
  return computeUnlockSets(rows);
}
