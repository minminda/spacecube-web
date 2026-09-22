import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENABLE_GUESTBOOK_COMMENTS } from "@/lib/pilotFlags";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";

const MAX_CONTENT = 200;

interface Props {
  params: Promise<{ id: string; commentId: string }>;
}

// 노트(src/app/api/guestbook/[id]/route.ts)와 동일한 작성자 판정 — 로그인은 userId,
// 비로그인은 sc_anon_id 쿠키로 본인 댓글을 확인한다.
async function resolveCommentOwnership(comment: { userId: string | null; anonId: string | null }) {
  const session = await auth();
  if (session?.user?.id) {
    return { authenticated: true, isOwner: comment.userId === session.user.id };
  }
  const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
  return { authenticated: !!anonId, isOwner: !!anonId && comment.anonId === anonId };
}

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!ENABLE_GUESTBOOK_COMMENTS) {
    return NextResponse.json({ error: "현재 댓글 기능을 사용할 수 없습니다.", code: "COMMENTS_DISABLED" }, { status: 403 });
  }

  const { commentId } = await params;
  const comment = await prisma.guestbookComment.findUnique({ where: { id: commentId } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const ownership = await resolveCommentOwnership(comment);
  if (!ownership.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ownership.isOwner) {
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

  const { commentId } = await params;
  const comment = await prisma.guestbookComment.findUnique({ where: { id: commentId } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const ownership = await resolveCommentOwnership(comment);
  if (!ownership.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ownership.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.guestbookComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
