import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPinFormat, verifyOperatorPin } from "@/lib/operatorPin";
import { setOperatorSessionCookie } from "@/lib/operatorSession";
import { getClientIp, isRateLimited, recordFailedAttempt, resetAttempts } from "@/lib/operatorRateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const spaceId = typeof body.spaceId === "string" ? body.spaceId : "";
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!spaceId || !isValidPinFormat(pin)) {
    return NextResponse.json({ error: "INVALID_FORMAT" }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(spaceId, ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, operatorPinHash: true, operatorAccessVersion: true },
  });
  if (!space) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!space.operatorPinHash) {
    return NextResponse.json({ error: "NOT_REGISTERED" }, { status: 409 });
  }

  const valid = await verifyOperatorPin(pin, space.operatorPinHash);
  if (!valid) {
    recordFailedAttempt(spaceId, ip);
    return NextResponse.json({ error: "INVALID" }, { status: 401 });
  }

  resetAttempts(spaceId, ip);
  await setOperatorSessionCookie(space.id, space.operatorAccessVersion);
  return NextResponse.json({ ok: true });
}
