import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

interface LinkInput {
  tagId: string;
  weight: number;
  isPrimary: boolean;
  visibleToUsers: boolean;
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
  const links: LinkInput[] = Array.isArray(body.links)
    ? body.links
        .filter((l: unknown): l is Record<string, unknown> => typeof l === "object" && l !== null && typeof (l as Record<string, unknown>).tagId === "string")
        .map((l: Record<string, unknown>) => ({
          tagId: l.tagId as string,
          weight: typeof l.weight === "number" ? l.weight : 1,
          isPrimary: l.isPrimary === true,
          visibleToUsers: l.visibleToUsers !== false,
        }))
    : [];

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
