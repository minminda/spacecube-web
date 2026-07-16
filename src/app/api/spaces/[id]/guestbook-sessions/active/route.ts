import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { parseGuestbookSessionInput } from "@/lib/guestbookSessionInput";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 현재 ACTIVE 세션의 질문/표시여부/위치/스타일을 갱신한다 — 관리자 전용
 * (운영자/공간 소유자는 canAccessSpace가 아니라 isAdmin만으로 판정하므로 접근 불가).
 * 질문 텍스트를 ACTIVE 세션에서도 바꿀 수 있게 허용한다: GuestbookNote.clusterType은
 * "어느 군집에 썼는지"만 저장하고 질문의 실제 문구는 저장하지 않으므로, 이미 작성된
 * 포스트잇의 과거 데이터는 이 변경으로 손상되지 않는다.
 */
export async function PUT(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
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
