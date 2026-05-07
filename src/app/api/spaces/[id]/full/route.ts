import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

// 운영자: 만석 상태 토글
export async function PATCH(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id }, select: { isFullyBooked: true } });
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.space.update({
    where: { id },
    data: { isFullyBooked: !space.isFullyBooked },
    select: { isFullyBooked: true },
  });

  return NextResponse.json(updated);
}
