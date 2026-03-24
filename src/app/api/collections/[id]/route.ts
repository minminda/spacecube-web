import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const col = await prisma.collection.findUnique({ where: { id } });
  if (!col || col.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const updated = await prisma.collection.update({
    where: { id },
    data: { name: name.trim().slice(0, 30) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const col = await prisma.collection.findUnique({ where: { id } });
  if (!col || col.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
