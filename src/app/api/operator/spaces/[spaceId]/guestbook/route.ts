import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ spaceId: string }>;
}

// 운영자용 "이번 기간 방명록 열람" — 현재 ACTIVE 세션의 노트만 반환한다.
// 방문자의 이메일/전화번호 등 민감 정보는 select하지 않는다(닉네임만 노출).
export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { spaceId } = await params;
  const access = await requireSpaceAccess(user.id, user.email, spaceId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const activeSession = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.ACTIVE },
  });

  if (!activeSession) {
    return NextResponse.json({ session: null, notes: [] });
  }

  const notes = await prisma.guestbookNote.findMany({
    where: { guestbookSessionId: activeSession.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      nickname: true,
      clusterType: true,
      createdAt: true,
      _count: { select: { reactions: true } },
    },
  });

  return NextResponse.json({
    session: {
      id: activeSession.id,
      title: activeSession.title,
      question1: activeSession.question1,
      question2: activeSession.question2,
      startsAt: activeSession.startsAt?.toISOString() ?? null,
    },
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      nickname: n.nickname,
      clusterType: n.clusterType,
      createdAt: n.createdAt.toISOString(),
      reactionCount: n._count.reactions,
    })),
  });
}
