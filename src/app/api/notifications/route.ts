import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { ENABLE_NOTIFICATIONS } from "@/lib/pilotFlags";

const MAX_NOTIFICATIONS = 50; // 무한 피드가 아니라 "최근 반응 확인" 정도로 제한

// 내 알림 목록 — 최신순. 이동 링크는 대상 포스트잇이 현재 ACTIVE 세션에 있으면 기존 캔버스 점프(?focus=)를,
// 종료된 세션이면 방문자용 아카이브 리스트의 하이라이트(?highlight=)를 계산해 내려준다.
export async function GET() {
  // 파일럿 기간 알림 비활성 — 항상 빈 목록을 반환한다(UI에서도 벨을 숨김).
  if (!ENABLE_NOTIFICATIONS) {
    return NextResponse.json({ notifications: [] });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const notifications = await prisma.notification.findMany({
    where: { receiverId: user.id },
    orderBy: { createdAt: "desc" },
    take: MAX_NOTIFICATIONS,
    include: {
      sender: { select: { nickname: true } },
      comment: { select: { content: true } },
      note: {
        select: {
          guestbookSessionId: true,
          space: { select: { slug: true } },
          session: { select: { status: true } },
        },
      },
    },
  });

  const result = notifications.map((n) => {
    const isActiveSession = n.note.session.status === GuestbookSessionStatus.ACTIVE;
    const url = isActiveSession
      ? `/space/${n.note.space.slug}/guestbook?focus=${n.guestbookId}`
      : `/space/${n.note.space.slug}/guestbook/archive/${n.note.guestbookSessionId}?highlight=${n.guestbookId}`;

    return {
      id: n.id,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      senderNickname: n.sender.nickname ?? "익명",
      commentPreview: n.comment?.content ?? null,
      url,
    };
  });

  return NextResponse.json({ notifications: result });
}
