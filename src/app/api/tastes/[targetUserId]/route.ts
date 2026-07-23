import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Ctx { params: Promise<{ targetUserId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetUserId } = await params;
  await prisma.savedTaste.deleteMany({
    where: { userId: user.id, targetUserId },
  });
  return NextResponse.json({ ok: true });
}
