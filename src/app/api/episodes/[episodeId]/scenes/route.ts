import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
  const content = typeof body.content === "string" ? body.content : "";

  const count = await prisma.scene.count({ where: { episodeId } });

  const scene = await prisma.scene.create({
    data: {
      episodeId,
      title: body.title || null,
      content,
      displayOrder: count,
    },
  });

  return NextResponse.json(scene, { status: 201 });
}
