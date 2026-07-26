import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { GuestbookSessionStatus } from "@prisma/client";
import { parseGuestbookSessionInput } from "@/lib/guestbookSessionInput";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string }>;
}

/**
 * 운영자용 방명록 편집 — 현재 ACTIVE 세션의 질문 문구·표시여부·글자크기·색상·위치를
 * 전부 바꿀 수 있다(자기 공간에 한해서만, requireOperatorSpace). 관리자용
 * /api/spaces/[id]/guestbook-sessions/active와 완전히 같은 파서(parseGuestbookSessionInput,
 * guestbookSessionInput.ts)를 공유한다 — 필드 범위 차이 없음, 인가 게이트(공간 범위)만 다르다.
 * DRAFT 준비·"새 방명록 시작"·지난 방명록 아카이브는 여전히 관리자 전용이라 이 라우트가
 * 다루지 않는다.
 */
export async function PUT(req: NextRequest, { params }: Props) {
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
  const data = parseGuestbookSessionInput(body, active);

  const updated = await prisma.guestbookSession.update({ where: { id: active.id }, data });
  return NextResponse.json(updated);
}
