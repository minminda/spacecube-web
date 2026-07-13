import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ALLOW_SELF_GUESTBOOK_REACTION } from "@/lib/features";
import { canReact } from "@/lib/guestbookReaction";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  const { id: postId } = await params;

  const [reactionCount, myReaction] = await Promise.all([
    prisma.guestbookReaction.count({ where: { postId } }),
    session?.user?.email
      ? prisma.user
          .findUnique({ where: { email: session.user.email } })
          .then((u) => (u ? prisma.guestbookReaction.findUnique({ where: { postId_userId: { postId, userId: u.id } } }) : null))
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ reactionCount, reacted: !!myReaction });
}

// 공감 토글 — 로그인 사용자만, 포스트잇당 1회. 다시 누르면 취소. 자신의 글은 정책 상수로 차단(MVP: 차단).
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: postId } = await params;
  const note = await prisma.guestbookNote.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (!canReact(note.userId, user.id, ALLOW_SELF_GUESTBOOK_REACTION)) {
    return NextResponse.json({ error: "자신의 글에는 공감할 수 없습니다." }, { status: 403 });
  }

  const existing = await prisma.guestbookReaction.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });

  if (existing) {
    await prisma.guestbookReaction.delete({ where: { id: existing.id } });
    const reactionCount = await prisma.guestbookReaction.count({ where: { postId } });
    return NextResponse.json({ reacted: false, reactionCount });
  }

  try {
    await prisma.guestbookReaction.create({ data: { postId, userId: user.id } });
  } catch (err) {
    // 동시 요청 경쟁 — 이미 다른 요청이 같은 공감을 만들었으면 그대로 진행(멱등), 그 외 에러는 재전파.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  const reactionCount = await prisma.guestbookReaction.count({ where: { postId } });
  return NextResponse.json({ reacted: true, reactionCount });
}
