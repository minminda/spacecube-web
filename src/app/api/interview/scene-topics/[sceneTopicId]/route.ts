import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateSceneTopicTitle, validateSceneTopicDescription } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ sceneTopicId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneTopicId } = await params;
  const existing = await prisma.interviewSceneTopic.findUnique({ where: { id: sceneTopicId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    const validation = validateSceneTopicTitle(title);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    data.title = title;
  }
  if ("description" in body) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const validation = validateSceneTopicDescription(description);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    data.description = description || null;
  }
  if (typeof body.isRequired === "boolean") data.isRequired = body.isRequired;

  const sceneTopic = await prisma.interviewSceneTopic.update({ where: { id: sceneTopicId }, data });
  return NextResponse.json(sceneTopic);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneTopicId } = await params;
  const existing = await prisma.interviewSceneTopic.findUnique({
    where: { id: sceneTopicId },
    select: { id: true, episodeTemplateId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.interviewSceneTopic.delete({ where: { id: sceneTopicId } });

  const remaining = await prisma.interviewSceneTopic.findMany({
    where: { episodeTemplateId: existing.episodeTemplateId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((t, i) => prisma.interviewSceneTopic.update({ where: { id: t.id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
