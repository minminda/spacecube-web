import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const story = await prisma.contentStory.findUnique({
    where: { id },
    include: {
      storySpaces: {
        orderBy: { order: "asc" },
        include: { space: { select: { id: true, name: true, slug: true, type: true, district: true, imageUrl: true, tagline: true } } },
      },
    },
  });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { spaceIds, ...fields } = body;

  const story = await prisma.contentStory.update({
    where: { id },
    data: {
      ...fields,
      publishedAt: fields.publishedAt ? new Date(fields.publishedAt) : fields.publishedAt,
      ...(spaceIds !== undefined && {
        storySpaces: {
          deleteMany: {},
          create: spaceIds.map((spaceId: string, i: number) => ({ spaceId, order: i })),
        },
      }),
    },
    include: { storySpaces: { orderBy: { order: "asc" }, include: { space: true } } },
  });

  return NextResponse.json(story);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.contentStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
