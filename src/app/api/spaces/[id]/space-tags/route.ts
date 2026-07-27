import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { enforceSingleSelectCategories, type TagLinkInput } from "@/lib/tagLinks";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

function isTagLinkInput(v: unknown): v is TagLinkInput {
  return typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).tagId === "string";
}

export async function PUT(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const rawLinks: TagLinkInput[] = Array.isArray(body.links) ? body.links.filter(isTagLinkInput) : [];
  // 클라이언트가 실수로 SINGLE 카테고리에 2개를 보내도 서버가 한 번 더 강제한다.
  const links = await enforceSingleSelectCategories(rawLinks);

  await prisma.$transaction([
    prisma.spaceTag.deleteMany({ where: { spaceId } }),
    ...(links.length > 0
      ? [
          prisma.spaceTag.createMany({
            data: links.map((l) => ({ spaceId, ...l })),
          }),
        ]
      : []),
  ]);

  const updated = await prisma.spaceTag.findMany({
    where: { spaceId },
    include: { tag: true },
  });

  return NextResponse.json(updated);
}
