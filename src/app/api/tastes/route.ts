import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === user.id)
    return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const saved = await prisma.savedTaste.upsert({
    where: { userId_targetUserId: { userId: user.id, targetUserId } },
    create: { userId: user.id, targetUserId },
    update: {},
  });
  return NextResponse.json(saved);
}
