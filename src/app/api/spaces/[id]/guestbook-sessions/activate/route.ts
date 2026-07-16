import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 새 방명록 시작 — 트랜잭션으로 기존 ACTIVE 세션을 ARCHIVED로 종료하고 DRAFT를 ACTIVE로
 * 승격한다(옛 운영자용 activate/route.ts와 동일한 트랜잭션). 관리자 전용.
 * 먼저 기존 ACTIVE의 status를 바꿔야 partial unique index(공간당 ACTIVE 1개)와 충돌하지 않는다.
 */
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const draft = await prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } });
  if (!draft) {
    return NextResponse.json({ error: "준비된 다음 방명록이 없습니다. 질문을 먼저 저장해주세요." }, { status: 400 });
  }

  const activated = await prisma.$transaction(async (tx) => {
    await tx.guestbookSession.updateMany({
      where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
      data: { status: GuestbookSessionStatus.ARCHIVED, endsAt: new Date() },
    });
    return tx.guestbookSession.update({
      where: { id: draft.id },
      data: { status: GuestbookSessionStatus.ACTIVE, startsAt: new Date() },
    });
  });

  return NextResponse.json({
    id: activated.id,
    status: activated.status,
    startsAt: activated.startsAt?.toISOString() ?? null,
  });
}
