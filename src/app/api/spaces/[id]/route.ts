import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const space = await prisma.space.findUnique({ where: { id } });
  if (!space || space.ownerId !== user.id) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }

  const { name, type, location, description, philosophy, ownerMessage, imageUrl } = await req.json();

  const updated = await prisma.space.update({
    where: { id },
    data: { name, type, location, description, philosophy, ownerMessage: ownerMessage || null, imageUrl: imageUrl || null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const space = await prisma.space.findUnique({ where: { id } });
  if (!space || space.ownerId !== user.id) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }

  await prisma.space.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
