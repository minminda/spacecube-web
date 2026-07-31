import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateTopicTitle } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ episodeId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { id: true } });
  if (!episode) return NextResponse.json({ error: "에피소드를 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const validation = validateTopicTitle(title);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const count = await prisma.interviewTopic.count({ where: { episodeId } });

  const topic = await prisma.interviewTopic.create({
    data: { episodeId, title, displayOrder: count },
  });

  return NextResponse.json(topic, { status: 201 });
}
