import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

interface Props { params: Promise<{ id: string }> }

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
