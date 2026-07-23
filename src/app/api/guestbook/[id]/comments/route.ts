import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, NotificationType } from "@prisma/client";
import { shouldNotify } from "@/lib/notification";
import { canWriteToSession, canWriteCommentForVisit } from "@/lib/guestbookSession";
import { ENABLE_GUESTBOOK_COMMENTS, ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";

const MAX_CONTENT = 200;

interface Props {
  params: Promise<{ id: string }>; // id = GuestbookNote id
}

// 댓글 목록 — 오래된순(대화를 위에서 아래로 읽는 방식)
export async function GET(_req: NextRequest, { params }: Props) {
  // 파일럿 기간 댓글 비활성 — 항상 빈 목록(UI에서도 댓글 스레드를 숨김).
  if (!ENABLE_GUESTBOOK_COMMENTS) {
    return NextResponse.json({ comments: [] });
  }
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
  // 파일럿 기간 댓글 비활성 — 작성 자체를 막는다.
  if (!ENABLE_GUESTBOOK_COMMENTS) {
    return NextResponse.json({ error: "현재 댓글 기능을 사용할 수 없습니다.", code: "COMMENTS_DISABLED" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: guestbookId } = await params;
  const note = await prisma.guestbookNote.findUnique({
    where: { id: guestbookId },
    select: { id: true, userId: true, spaceId: true, guestbookSessionId: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // 댓글도 포스트잇과 동일하게 ACTIVE 세션에서만 — 종료된(ARCHIVED) 방명록은 읽기 전용.
  const noteSession = await prisma.guestbookSession.findUnique({ where: { id: note.guestbookSessionId } });
  if (!noteSession || !canWriteToSession(noteSession.status)) {
    return NextResponse.json({ error: "종료된 방명록에는 답글을 남길 수 없습니다." }, { status: 403 });
  }

  // 방문 단위 식별자 — 포스트잇 작성과 동일하게 이 공간에 대해 가장 최근에 인정된 방문(Record)을 쓴다.
  const currentVisit = await prisma.record.findFirst({
    where: { userId: user.id, spaceId: note.spaceId },
    orderBy: { visitedAt: "desc" },
  });
  if (!currentVisit) {
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

  // 한 번의 방문으로는(어느 포스트잇이든) 답글 하나만 — 삭제하면 같은 방문에서 다시 남길 수 있다
  // (댓글이 삭제되면 이 조회 자체가 더 이상 걸리지 않기 때문에 별도 처리 없이 자연히 재작성이 열린다).
  const existingForVisit = await prisma.guestbookComment.findFirst({
    where: { userId: user.id, guestbookSessionId: noteSession.id, recordId: currentVisit.id },
    select: { id: true },
  });
  if (!canWriteCommentForVisit(noteSession.status, !!existingForVisit)) {
    return NextResponse.json(
      {
        error: "이번 방문의 답글을 이미 남겼습니다. 다음 방문에서 새로운 답글을 남길 수 있어요.",
        code: "VISIT_ALREADY_COMMENTED",
      },
      { status: 409 },
    );
  }

  let comment;
  try {
    comment = await prisma.guestbookComment.create({
      data: {
        guestbookId,
        userId: user.id,
        content: text,
        guestbookSessionId: noteSession.id,
        recordId: currentVisit.id,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        {
          error: "이번 방문의 답글을 이미 남겼습니다. 다음 방문에서 새로운 답글을 남길 수 있어요.",
          code: "VISIT_ALREADY_COMMENTED",
        },
        { status: 409 },
      );
    }
    throw err;
  }

  if (ENABLE_NOTIFICATIONS && shouldNotify(note.userId, user.id)) {
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
