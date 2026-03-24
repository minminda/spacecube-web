import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Ctx { params: Promise<{ recordId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { recordId } = await params;
  const record = await prisma.record.findUnique({ where: { id: recordId } });
  if (!record || record.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.record.delete({ where: { id: recordId } });
  return NextResponse.json({ ok: true });
}
