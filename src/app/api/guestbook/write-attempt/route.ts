import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { GuestbookFunnelStep } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { recordGuestbookFunnelStep } from "@/lib/guestbookFunnel";
import { getOrCreateAnonVisitorId } from "@/lib/anonVisitor";

/**
 * GuestbookCanvas가 "포스트잇 작성" 버튼을 눌러 작성모드에 실제로 진입할 때(닉네임 설정
 * 여부와 무관하게, canWriteThisVisit 통과 직후) 호출한다. 첫 방문 흐름 단순화 이후 비로그인
 * 방문자도 작성 가능해졌으므로, 로그인은 userId로, 비로그인은 sc_anon_id 쿠키(anonId)로
 * 대칭적으로 계측한다.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.id && isAdmin(session.user.email)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { spaceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const spaceId = typeof body.spaceId === "string" ? body.spaceId : null;
  if (!spaceId) {
    return new NextResponse(null, { status: 204 });
  }

  if (session?.user?.id) {
    await recordGuestbookFunnelStep({ spaceId, step: GuestbookFunnelStep.WRITE_ATTEMPT, userId: session.user.id });
  } else {
    const anonId = getOrCreateAnonVisitorId(await cookies());
    await recordGuestbookFunnelStep({ spaceId, step: GuestbookFunnelStep.WRITE_ATTEMPT, anonId });
  }

  return new NextResponse(null, { status: 204 });
}
