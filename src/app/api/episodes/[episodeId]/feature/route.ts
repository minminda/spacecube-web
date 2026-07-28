import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ episodeId: string }> }

/** 대표 이야기(QR 스캔 직후 바로 진입할 Episode) 지정/해제 — 공간당 최대 1개만 유지한다. */
export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { episodeId } = await params;
  const { featured } = await req.json().catch(() => ({})) as { featured?: boolean };
  if (typeof featured !== "boolean") {
    return NextResponse.json({ error: "featured는 boolean이어야 해요." }, { status: 400 });
  }

  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { spaceId: true } });
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (featured) {
    await prisma.$transaction([
      prisma.episode.updateMany({ where: { spaceId: episode.spaceId, id: { not: episodeId } }, data: { isFeatured: false } }),
      prisma.episode.update({ where: { id: episodeId }, data: { isFeatured: true } }),
    ]);
  } else {
    await prisma.episode.update({ where: { id: episodeId }, data: { isFeatured: false } });
  }

  return NextResponse.json({ ok: true });
}
