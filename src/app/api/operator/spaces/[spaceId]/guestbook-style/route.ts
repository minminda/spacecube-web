import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { GuestbookSessionStatus } from "@prisma/client";
import { parseGuestbookStyleInput } from "@/lib/guestbookSessionInput";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string }>;
}

/**
 * 운영자가 직접 바꿀 수 있는 범위는 현재 ACTIVE 세션의 질문 1·질문 2 글자 크기·색상뿐이다
 * — 질문 문구·표시여부·위치·자유 영역 스타일은 계속 관리자 전용(guestbook-sessions/active).
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
  });
  if (!active) {
    return NextResponse.json({ error: "현재 진행 중인 방명록이 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data = parseGuestbookStyleInput(body, active);

  const updated = await prisma.guestbookSession.update({ where: { id: active.id }, data });
  return NextResponse.json(updated);
}
