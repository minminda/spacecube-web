import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { shouldNotify } from "@/lib/notification";

const MAX_CONTENT = 200;

interface Props {
  params: Promise<{ id: string }>; // id = GuestbookNote id
}

// 댓글 목록 — 오래된순(대화를 위에서 아래로 읽는 방식)
export async function GET(_req: NextRequest, { params }: Props) {
  const { id: guestbookId } = await params;

  const comments = await prisma.guestbookComment.findMany({
    where: { guestbookId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { nickname: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      nickname: c.user.nickname,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// 댓글 작성 — 포스트잇 작성과 동일하게 해당 공간에 기록(Record)이 있어야 가능. 자기 글에도 작성 가능.
export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: guestbookId } = await params;
  const note = await prisma.guestbookNote.findUnique({
    where: { id: guestbookId },
    select: { id: true, userId: true, spaceId: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const hasRecord = await prisma.record.count({ where: { userId: user.id, spaceId: note.spaceId } });
  if (hasRecord === 0) {
    return NextResponse.json({ error: "이 공간에 대한 기록을 먼저 남겨주세요." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.content === "string" ? body.content.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (text.length > MAX_CONTENT) {
    return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
  }

  const comment = await prisma.guestbookComment.create({
    data: { guestbookId, userId: user.id, content: text },
  });

  if (shouldNotify(note.userId, user.id)) {
    await prisma.notification.create({
      data: {
        receiverId: note.userId,
        senderId: user.id,
        type: NotificationType.COMMENT,
        guestbookId,
        commentId: comment.id,
      },
    });
  }

  return NextResponse.json(
    {
      id: comment.id,
      userId: comment.userId,
      nickname: user.nickname,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
