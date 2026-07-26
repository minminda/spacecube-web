import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace, setOperatorSessionCookie } from "@/lib/operatorSession";
import { hashOperatorPin, verifyOperatorPin, isValidPinFormat } from "@/lib/operatorPin";
import { getClientIp, isRateLimited, recordFailedAttempt, resetAttempts } from "@/lib/operatorRateLimit";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string }>;
}

/**
 * 운영자 셀프서비스 PIN 변경 — 현재 PIN 재확인 후에만 바꿀 수 있다. 변경 즉시
 * operatorAccessVersion을 올려 기존 세션 쿠키를 무효화하되, 이 요청의 응답에는
 * 새 쿠키를 바로 발급해 운영자가 변경 직후 로그아웃되지 않게 한다.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPin = typeof body.currentPin === "string" ? body.currentPin : "";
  const newPin = typeof body.newPin === "string" ? body.newPin : "";

  if (!isValidPinFormat(currentPin) || !isValidPinFormat(newPin)) {
    return NextResponse.json({ error: "비밀번호는 숫자 4자리여야 해요." }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(spaceId, ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { operatorPinHash: true, operatorAccessVersion: true },
  });
  if (!space?.operatorPinHash) {
    return NextResponse.json({ error: "NOT_REGISTERED" }, { status: 409 });
  }

  const valid = await verifyOperatorPin(currentPin, space.operatorPinHash);
  if (!valid) {
    recordFailedAttempt(spaceId, ip);
    return NextResponse.json({ error: "INVALID_CURRENT" }, { status: 401 });
  }
  resetAttempts(spaceId, ip);

  const updated = await prisma.space.update({
    where: { id: spaceId },
    data: {
      operatorPinHash: await hashOperatorPin(newPin),
      operatorPinUpdatedAt: new Date(),
      operatorAccessVersion: { increment: 1 },
    },
    select: { operatorAccessVersion: true },
  });

  await setOperatorSessionCookie(spaceId, updated.operatorAccessVersion);
  return NextResponse.json({ ok: true });
}
