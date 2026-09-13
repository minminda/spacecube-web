import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, NotificationType } from "@prisma/client";
import { ALLOW_SELF_GUESTBOOK_REACTION } from "@/lib/features";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";
import { canReact } from "@/lib/guestbookReaction";
import { shouldNotify } from "@/lib/notification";
import { ANON_VISITOR_COOKIE, getOrCreateAnonVisitorId } from "@/lib/anonVisitor";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  const { id: postId } = await params;

  const [reactionCount, myReaction] = await Promise.all([
    prisma.guestbookReaction.count({ where: { postId } }),
    session?.user?.id
      ? prisma.user
          .findUnique({ where: { id: session.user.id } })
          .then((u) => (u ? prisma.guestbookReaction.findUnique({ where: { postId_userId: { postId, userId: u.id } } }) : null))
      : (async () => {
          const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
          return anonId ? prisma.guestbookReaction.findUnique({ where: { postId_anonId: { postId, anonId } } }) : null;
        })(),
  ]);

  return NextResponse.json({ reactionCount, reacted: !!myReaction });
}

// 공감 토글 — 포스트잇당 1회(로그인은 userId, 비로그인은 anonId 기준). 다시 누르면 취소.
// 자신의 글은 정책 상수로 차단(MVP: 차단).
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();

  let viewerUserId: string | null = null;
  let viewerAnonId: string | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    viewerUserId = user.id;
  } else {
    viewerAnonId = getOrCreateAnonVisitorId(await cookies());
  }
  const identityWhere = viewerUserId ? { userId: viewerUserId } : { anonId: viewerAnonId! };

  const { id: postId } = await params;
  const note = await prisma.guestbookNote.findUnique({ where: { id: postId }, select: { id: true, userId: true, anonId: true } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (!canReact({ userId: note.userId, anonId: note.anonId }, { userId: viewerUserId, anonId: viewerAnonId }, ALLOW_SELF_GUESTBOOK_REACTION)) {
    return NextResponse.json({ error: "자신의 글에는 공감할 수 없습니다." }, { status: 403 });
  }

  const existing = viewerUserId
    ? await prisma.guestbookReaction.findUnique({ where: { postId_userId: { postId, userId: viewerUserId } } })
    : await prisma.guestbookReaction.findUnique({ where: { postId_anonId: { postId, anonId: viewerAnonId! } } });

  // 알림은 반응자·작성자 둘 다 실제 로그인 사용자일 때만 의미가 있다(User가 없는 익명
  // 신원에는 senderId/receiverId를 채울 수 없다).
  const canNotify = !!viewerUserId && !!note.userId;

  if (existing) {
    await prisma.guestbookReaction.delete({ where: { id: existing.id } });
    // 공감을 취소하면 "공감했다"는 사실 자체가 사라지므로 관련 알림도 함께 지운다(다시 누르면 새로 생김).
    if (canNotify) {
      await prisma.notification.deleteMany({
        where: { receiverId: note.userId!, senderId: viewerUserId!, type: NotificationType.LIKE, guestbookId: postId },
      });
    }
    const reactionCount = await prisma.guestbookReaction.count({ where: { postId } });
    return NextResponse.json({ reacted: false, reactionCount });
  }

  try {
    await prisma.guestbookReaction.create({ data: { postId, ...identityWhere } });
  } catch (err) {
    // 동시 요청 경쟁 — 이미 다른 요청이 같은 공감을 만들었으면 그대로 진행(멱등), 그 외 에러는 재전파.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  // 공감은 유지하되, 파일럿 기간엔 알림 생성만 건너뛴다.
  if (canNotify && ENABLE_NOTIFICATIONS && shouldNotify(note.userId!, viewerUserId!)) {
    const existingNotification = await prisma.notification.findFirst({
      where: { receiverId: note.userId!, senderId: viewerUserId!, type: NotificationType.LIKE, guestbookId: postId },
    });
    if (!existingNotification) {
      await prisma.notification.create({
        data: { receiverId: note.userId!, senderId: viewerUserId!, type: NotificationType.LIKE, guestbookId: postId },
      });
    }
  }

  const reactionCount = await prisma.guestbookReaction.count({ where: { postId } });
  return NextResponse.json({ reacted: true, reactionCount });
}
