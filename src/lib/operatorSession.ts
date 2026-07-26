/* ── 운영자 PIN 접근 세션(sc_operator_access) ──────────────────────────
   /operator는 더 이상 Google 로그인이나 Space.ownerId 연결에 의존하지 않는다 — "공간 검색 +
   4자리 PIN"만으로 인증한다(사용자 로그인과 완전히 분리된 별도 축). 인증에 성공하면 이 파일이
   spaceId + operatorAccessVersion을 서명해 HttpOnly 쿠키로 발급하고, 이후 모든 /operator
   페이지·API는 이 쿠키만 검증한다.

   src/lib/spaceUnlock.ts의 QR_ACCESS_COOKIE와 동일한 HMAC 서명 패턴(AUTH_SECRET, base64url
   payload+서명, timingSafeEqual 비교)을 그대로 재사용한다 — 새 의존성 없이 이미 검증된 패턴.

   PIN을 변경하면 관리자 쪽에서 Space.operatorAccessVersion을 +1 한다. 이 파일은 쿠키를
   신뢰하지 않고 매 요청마다 DB의 현재 operatorAccessVersion과 쿠키 payload의 값을 대조하므로,
   PIN이 바뀌는 순간 이미 발급된 옛 쿠키는(만료 전이라도) 즉시 무효화된다. ── */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const OPERATOR_SESSION_COOKIE = "sc_operator_access";
export const OPERATOR_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12시간

interface OperatorSessionPayload {
  spaceId: string;
  accessVersion: number;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — 운영자 세션 토큰을 서명할 수 없습니다.");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function createToken(payload: OperatorSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string | undefined | null): OperatorSessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<OperatorSessionPayload>;
    if (
      typeof payload.spaceId !== "string" ||
      typeof payload.accessVersion !== "number" ||
      typeof payload.exp !== "number" ||
      Date.now() > payload.exp
    ) {
      return null;
    }
    return payload as OperatorSessionPayload;
  } catch {
    return null;
  }
}

/** PIN 검증 성공 직후 호출 — 서명된 세션 쿠키를 발급한다. */
export async function setOperatorSessionCookie(spaceId: string, accessVersion: number): Promise<void> {
  const token = createToken({ spaceId, accessVersion, exp: Date.now() + OPERATOR_SESSION_MAX_AGE_SECONDS * 1000 });
  const store = await cookies();
  store.set(OPERATOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OPERATOR_SESSION_MAX_AGE_SECONDS,
  });
}

/** "운영 종료"/로그아웃 — 쿠키 삭제. */
export async function clearOperatorSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(OPERATOR_SESSION_COOKIE);
}

/**
 * 현재 브라우저의 운영자 세션을 검증한다. 서명·만료뿐 아니라 DB의 최신 operatorAccessVersion과
 * 쿠키 payload를 대조해, PIN이 그 사이 바뀌었으면(버전 불일치) 세션을 무효 처리한다.
 */
export async function getOperatorSession(): Promise<{ spaceId: string } | null> {
  const store = await cookies();
  const payload = verifyToken(store.get(OPERATOR_SESSION_COOKIE)?.value);
  if (!payload) return null;

  const space = await prisma.space.findUnique({
    where: { id: payload.spaceId },
    select: { operatorAccessVersion: true },
  });
  if (!space || space.operatorAccessVersion !== payload.accessVersion) return null;

  return { spaceId: payload.spaceId };
}

/** 특정 spaceId에 대한 접근 권한만 필요한 API/페이지용 — 다른 공간 URL 직접 접근을 차단한다. */
export async function requireOperatorSpace(spaceId: string): Promise<boolean> {
  const session = await getOperatorSession();
  return session?.spaceId === spaceId;
}

export interface OperatorSpaceRef {
  id: string;
  slug: string;
}

/**
 * /operator/[slug]/** 페이지가 공통으로 쓰는 진입 검증. URL에는 DB cuid를 노출하지 않고
 * Space.slug를 쓴다(기존 /space/[slug]와 같은 필드 재사용, 새 slug 체계를 만들지 않음).
 *
 * slug로 못 찾으면 레거시 DB id URL(`/operator/cmn2r2bb8...`)로 접근한 것일 수 있어 id로
 * 한 번 더 찾는다 — 있으면 올바른 slug URL로 307(임시) redirect한다. slug는 이미
 * `/space/[slug]`에서도 공개되는 정보라 redirect 자체에 인증 확인을 앞세우지 않고,
 * 실제 접근 가능 여부는 도착한 slug 페이지가 requireOperatorSpace로 다시 검증한다.
 */
export async function resolveOperatorSpaceOrRedirect(slugParam: string, subpath: string): Promise<OperatorSpaceRef> {
  const space = await prisma.space.findUnique({ where: { slug: slugParam }, select: { id: true, slug: true } });

  if (!space) {
    const bySpaceId = await prisma.space.findUnique({ where: { id: slugParam }, select: { id: true, slug: true } });
    if (bySpaceId) redirect(`/operator/${bySpaceId.slug}${subpath}`);
    redirect("/operator");
  }

  if (!(await requireOperatorSpace(space.id))) redirect("/operator");
  return space;
}
