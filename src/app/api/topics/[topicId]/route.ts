import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateTopicTitle } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ topicId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;
  const existing = await prisma.interviewTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.title !== "string") {
    return NextResponse.json({ error: "title이 필요해요." }, { status: 400 });
  }
  const title = body.title.trim();
  const validation = validateTopicTitle(title);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const topic = await prisma.interviewTopic.update({ where: { id: topicId }, data: { title } });
  return NextResponse.json(topic);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;
  const topic = await prisma.interviewTopic.findUnique({ where: { id: topicId }, select: { episodeId: true } });
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.interviewTopic.delete({ where: { id: topicId } });

  const remaining = await prisma.interviewTopic.findMany({
    where: { episodeId: topic.episodeId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((t, i) => prisma.interviewTopic.update({ where: { id: t.id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
