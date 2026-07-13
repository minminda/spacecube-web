import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 알림 패널을 열면 호출 — 그 시점의 미읽음 전체를 읽음 처리한다.
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.notification.updateMany({
    where: { receiverId: user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
