import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { enforceSingleSelectCategories, resolveSpaceTypeName, type TagLinkInput } from "@/lib/tagLinks";

export const dynamic = "force-dynamic";

function isTagLinkInput(v: unknown): v is TagLinkInput {
  return typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).tagId === "string";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const {
    name, slug, district, location,
    tagline, openingHours, naverMapUrl,
    description, philosophy, ownerMessage,
    experienceGuide, spacePoints,
    storyItems,
    tagLinks,
    imageUrl,
    imageZoom,
    imagePositionX,
    imagePositionY,
  } = await req.json();

  // "공간 유형" 카테고리 선택(SpaceForm에서 필수)이 Space.type 파생 캐시가 된다.
  const rawTagLinks = Array.isArray(tagLinks) ? tagLinks.filter(isTagLinkInput) : [];
  const normalizedLinks = await enforceSingleSelectCategories(rawTagLinks);
  const resolvedType = await resolveSpaceTypeName(normalizedLinks);

  if (!name || !slug || !resolvedType || !district || !location) {
    return NextResponse.json({ error: "필수 항목이 빠졌어요." }, { status: 400 });
  }

  const exists = await prisma.space.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "이미 사용 중인 주소예요." }, { status: 409 });
  }

  const space = await prisma.space.create({
    data: {
      ownerId: user.id,
      name, slug, type: resolvedType, district, location,
      tagline: tagline || null,
      openingHours: openingHours || null,
      naverMapUrl: naverMapUrl || null,
      description: description || "", philosophy: philosophy || "",
      ownerMessage: ownerMessage || null,
      experienceGuide: experienceGuide || null,
      spacePoints: spacePoints || null,
      storyItems: storyItems ?? null,
      imageUrl: imageUrl || null,
      imageZoom: typeof imageZoom === "number" ? imageZoom : 1,
      imagePositionX: typeof imagePositionX === "number" ? imagePositionX : 0.5,
      imagePositionY: typeof imagePositionY === "number" ? imagePositionY : 0.5,
    },
  });

  if (normalizedLinks.length > 0) {
    await prisma.spaceTag.createMany({
      data: normalizedLinks.map((l) => ({ spaceId: space.id, ...l })),
    });
  }

  return NextResponse.json(space, { status: 201 });
}
