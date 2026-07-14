import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, title, slug, district, persona, imageUrl, intro, body: bodyText, bodyBlocks, cta, publishedAt, isActive, spaceIds } = body;

  if (!type || !title || !slug || !intro || !bodyText) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const story = await prisma.contentStory.create({
    data: {
      type,
      title,
      slug,
      district: district || null,
      persona: persona || null,
      imageUrl: imageUrl || null,
      intro,
      body: bodyText,
      bodyBlocks: bodyBlocks ?? null,
      cta: cta || null,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      isActive: isActive ?? true,
      storySpaces: spaceIds?.length
        ? { create: spaceIds.map((spaceId: string, i: number) => ({ spaceId, order: i })) }
        : undefined,
    },
    include: { storySpaces: { include: { space: true } } },
  });

  return NextResponse.json(story, { status: 201 });
}
