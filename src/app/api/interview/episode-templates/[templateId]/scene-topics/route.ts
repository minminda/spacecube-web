import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateSceneTopicTitle, validateSceneTopicDescription } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ templateId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const template = await prisma.interviewEpisodeTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!template) return NextResponse.json({ error: "에피소드 템플릿을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const validation = validateSceneTopicTitle(title);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const descValidation = validateSceneTopicDescription(description);
  if (!descValidation.ok) return NextResponse.json({ error: descValidation.error }, { status: 400 });

  const count = await prisma.interviewSceneTopic.count({ where: { episodeTemplateId: templateId } });

  const sceneTopic = await prisma.interviewSceneTopic.create({
    data: {
      episodeTemplateId: templateId,
      title,
      description: description || null,
      displayOrder: count,
    },
  });

  return NextResponse.json(sceneTopic, { status: 201 });
}
