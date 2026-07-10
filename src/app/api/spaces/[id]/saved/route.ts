import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const saved = await prisma.savedSpace.upsert({
    where: { userId_spaceId: { userId: user.id, spaceId } },
    create: { userId: user.id, spaceId },
    update: {},
  });
  return NextResponse.json(saved, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savedSpace.deleteMany({ where: { userId: user.id, spaceId } });
  return NextResponse.json({ ok: true });
}
