import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { isActive } = await req.json().catch(() => ({})) as { isActive?: boolean };
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive는 boolean이어야 해요." }, { status: 400 });
  }

  const updated = await prisma.space.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
  return NextResponse.json(updated);
}
