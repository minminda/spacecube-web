import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const col = await prisma.collection.findUnique({ where: { id } });
  if (!col || col.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { spaceId } = await req.json();
  if (!spaceId) return NextResponse.json({ error: "spaceId required" }, { status: 400 });

  const item = await prisma.collectionItem.upsert({
    where: { collectionId_spaceId: { collectionId: id, spaceId } },
    create: { collectionId: id, spaceId },
    update: {},
    include: { space: true },
  });
  return NextResponse.json(item);
}
