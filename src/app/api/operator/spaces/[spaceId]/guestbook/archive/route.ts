import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ spaceId: string }>;
}

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

  const sessions = await prisma.guestbookSession.findMany({
    where: { spaceId, status: GuestbookSessionStatus.ARCHIVED },
    orderBy: { startsAt: "desc" },
    include: {
      notes: {
        select: {
          id: true,
          userId: true,
          content: true,
          nickname: true,
          createdAt: true,
          _count: { select: { reactions: true } },
        },
      },
    },
  });

  const result = sessions.map((s) => {
    const totalReactions = s.notes.reduce((sum, n) => sum + n._count.reactions, 0);
    const uniqueWriterCount = new Set(s.notes.map((n) => n.userId)).size;
    const top = [...s.notes].sort((a, b) => b._count.reactions - a._count.reactions)[0];
    return {
      id: s.id,
      title: s.title,
      question1: s.question1,
      question2: s.question2,
      startsAt: s.startsAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
      postCount: s.notes.length,
      uniqueWriterCount,
      totalReactions,
      topNote:
        top && top._count.reactions > 0
          ? { content: top.content, nickname: top.nickname, reactionCount: top._count.reactions }
          : null,
    };
  });

  return NextResponse.json({ sessions: result });
}
