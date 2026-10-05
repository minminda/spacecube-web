import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetUserId } = await req.json();
  if (typeof targetUserId !== "string" || !targetUserId || targetUserId === user.id)
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  // 없는 사용자(FK 오류 → 500)·시연 계정은 따라갈 수 없다
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { isDemo: true } });
  if (!target || target.isDemo)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const saved = await prisma.savedTaste.upsert({
    where: { userId_targetUserId: { userId: user.id, targetUserId } },
    create: { userId: user.id, targetUserId },
    update: {},
  });
  return NextResponse.json(saved);
}
