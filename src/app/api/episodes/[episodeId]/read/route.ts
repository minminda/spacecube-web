import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ episodeId: string }> }

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { id: true } });
  if (!episode) return NextResponse.json({ error: "Episode를 찾을 수 없어요." }, { status: 404 });

  const read = await prisma.episodeRead.upsert({
    where: { userId_episodeId: { userId: user.id, episodeId } },
    create: { userId: user.id, episodeId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });

  return NextResponse.json(read);
}
