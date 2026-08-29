import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { GuestbookFunnelStep } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { recordGuestbookFunnelStep } from "@/lib/guestbookFunnel";

/**
 * GuestbookCanvas가 "포스트잇 작성" 버튼을 눌러 작성모드에 실제로 진입할 때(닉네임 설정
 * 여부와 무관하게, canWriteThisVisit 통과 직후) 호출한다. 현재 구조상 방명록 캔버스 자체가
 * 로그인 사용자만 도달 가능하므로 이 라우트도 로그인을 요구한다 — 비로그인 작성 흐름을
 * 새로 여는 게 아니라, 이미 로그인해야만 가능한 행동을 계측만 추가하는 것이다.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 204 });
  }
  if (isAdmin(session.user.email)) {
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

  await recordGuestbookFunnelStep({ spaceId, step: GuestbookFunnelStep.WRITE_ATTEMPT, userId: session.user.id });

  return new NextResponse(null, { status: 204 });
}
