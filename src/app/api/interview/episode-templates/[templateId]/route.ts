import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateEpisodeTemplateTitle, validateEpisodeTemplateDescription } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ templateId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const existing = await prisma.interviewEpisodeTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    const validation = validateEpisodeTemplateTitle(title);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    data.title = title;
  }
  if ("description" in body) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const validation = validateEpisodeTemplateDescription(description);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    data.description = description || null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const template = await prisma.interviewEpisodeTemplate.update({ where: { id: templateId }, data });
  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const existing = await prisma.interviewEpisodeTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.interviewEpisodeTemplate.delete({ where: { id: templateId } });

  // 남은 템플릿들을 순서대로 재번호 (episodeNumber도 displayOrder 순서에 맞춰 재부여)
  const remaining = await prisma.interviewEpisodeTemplate.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((t, i) =>
      prisma.interviewEpisodeTemplate.update({ where: { id: t.id }, data: { displayOrder: i, episodeNumber: i + 1 } })
    )
  );

  return NextResponse.json({ ok: true });
}
