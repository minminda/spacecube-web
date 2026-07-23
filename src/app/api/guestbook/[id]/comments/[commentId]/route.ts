import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";

const MAX_CONTENT = 200;

interface Props {
  params: Promise<{ id: string; commentId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Props) {
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

  const { commentId } = await params;
  const comment = await prisma.guestbookComment.findUnique({ where: { id: commentId } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.content === "string" ? body.content.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (text.length > MAX_CONTENT) {
    return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
  }

  const updated = await prisma.guestbookComment.update({ where: { id: commentId }, data: { content: text } });
  return NextResponse.json({ id: updated.id, content: updated.content });
}

// 댓글 삭제 — 연결된 알림(Notification.commentId)은 onDelete: Cascade로 함께 정리된다.
export async function DELETE(_req: NextRequest, { params }: Props) {
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

  const { commentId } = await params;
  const comment = await prisma.guestbookComment.findUnique({ where: { id: commentId } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.guestbookComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
