import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Ctx { params: Promise<{ id: string; spaceId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id, spaceId } = await params;
  const col = await prisma.collection.findUnique({ where: { id } });
  if (!col || col.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.collectionItem.deleteMany({
    where: { collectionId: id, spaceId },
  });
  return NextResponse.json({ ok: true });
}
