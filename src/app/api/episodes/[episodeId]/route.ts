import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ episodeId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if ("description" in body) data.description = body.description || null;
  if (Number.isInteger(body.unlockVisitCount)) data.unlockVisitCount = body.unlockVisitCount;
  if (typeof body.published === "boolean") data.published = body.published;
  if ("imageUrl" in body) data.imageUrl = body.imageUrl || null;
  if (typeof body.imageZoom === "number") data.imageZoom = body.imageZoom;
  if (typeof body.imagePositionX === "number") data.imagePositionX = body.imagePositionX;
  if (typeof body.imagePositionY === "number") data.imagePositionY = body.imagePositionY;

  if (data.title === "") {
    return NextResponse.json({ error: "제목은 비울 수 없어요." }, { status: 400 });
  }

  const episode = await prisma.episode.update({ where: { id: episodeId }, data });
  return NextResponse.json(episode);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { spaceId: true } });
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.episode.delete({ where: { id: episodeId } });

  // 남은 에피소드들을 순서대로 재번호
  const remaining = await prisma.episode.findMany({
    where: { spaceId: episode.spaceId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((ep, i) =>
      prisma.episode.update({ where: { id: ep.id }, data: { displayOrder: i, episodeNumber: i + 1 } })
    )
  );

  return NextResponse.json({ ok: true });
}
