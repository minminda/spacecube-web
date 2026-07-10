import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { moveInOrder } from "@/lib/adminReorder";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ sceneId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneId } = await params;
  const { direction } = await req.json().catch(() => ({})) as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction은 up 또는 down이어야 해요." }, { status: 400 });
  }

  const scene = await prisma.scene.findUnique({ where: { id: sceneId }, select: { episodeId: true } });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const siblings = await prisma.scene.findMany({
    where: { episodeId: scene.episodeId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  const nextOrder = moveInOrder(siblings.map((s) => s.id), sceneId, direction);

  await prisma.$transaction(
    nextOrder.map((id, i) => prisma.scene.update({ where: { id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
