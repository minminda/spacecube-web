import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "제목은 필수예요." }, { status: 400 });

  const count = await prisma.episode.count({ where: { spaceId } });

  const episode = await prisma.episode.create({
    data: {
      spaceId,
      title,
      episodeNumber: count + 1,
      displayOrder: count,
      description: body.description || null,
      unlockVisitCount: Number.isInteger(body.unlockVisitCount) ? body.unlockVisitCount : 0,
      published: false,
    },
  });

  return NextResponse.json(episode, { status: 201 });
}
