import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { moveInOrder } from "@/lib/adminReorder";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ sceneTopicId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneTopicId } = await params;
  const { direction } = await req.json().catch(() => ({})) as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction은 up 또는 down이어야 해요." }, { status: 400 });
  }

  const existing = await prisma.interviewSceneTopic.findUnique({
    where: { id: sceneTopicId },
    select: { id: true, episodeTemplateId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const siblings = await prisma.interviewSceneTopic.findMany({
    where: { episodeTemplateId: existing.episodeTemplateId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  const nextOrder = moveInOrder(siblings.map((s) => s.id), sceneTopicId, direction);

  await prisma.$transaction(
    nextOrder.map((id, i) => prisma.interviewSceneTopic.update({ where: { id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
