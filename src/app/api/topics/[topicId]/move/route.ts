import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { moveInOrder } from "@/lib/adminReorder";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ topicId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;
  const { direction } = await req.json().catch(() => ({})) as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "direction은 up 또는 down이어야 해요." }, { status: 400 });
  }

  const topic = await prisma.interviewTopic.findUnique({ where: { id: topicId }, select: { episodeId: true } });
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const siblings = await prisma.interviewTopic.findMany({
    where: { episodeId: topic.episodeId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  const nextOrder = moveInOrder(siblings.map((s) => s.id), topicId, direction);

  await prisma.$transaction(
    nextOrder.map((id, i) => prisma.interviewTopic.update({ where: { id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
