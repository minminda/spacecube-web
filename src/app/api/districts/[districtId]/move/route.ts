import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { moveInOrder } from "@/lib/adminReorder";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ districtId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { districtId } = await params;
  const { direction } = await req.json().catch(() => ({})) as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction은 up 또는 down이어야 해요." }, { status: 400 });
  }

  const all = await prisma.district.findMany({ orderBy: { order: "asc" }, select: { id: true } });
  const nextOrder = moveInOrder(all.map((d) => d.id), districtId, direction);

  await prisma.$transaction(
    nextOrder.map((id, i) => prisma.district.update({ where: { id }, data: { order: i } }))
  );

  return NextResponse.json({ ok: true });
}
