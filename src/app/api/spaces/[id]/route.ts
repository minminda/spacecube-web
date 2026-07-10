import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) {
    return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
  }

  const {
    name, type, district, location,
    tagline, openingHours, naverMapUrl,
    description, philosophy, ownerMessage,
    experienceGuide, spacePoints,
    storyItems,
    spaceTags,
    imageUrl,
    imageZoom,
    imagePositionX,
    imagePositionY,
    ownerName, ownerPhotoUrl, ownerBio, ownerValues,
    ownerPlaylistUrl, ownerBlogUrl, ownerSocialUrl,
  } = await req.json();

  const updated = await prisma.space.update({
    where: { id },
    data: {
      name, type, district, location,
      tagline: tagline || null,
      openingHours: openingHours || null,
      naverMapUrl: naverMapUrl || null,
      description,
      spaceTags: spaceTags ?? [],
      imageUrl: imageUrl || null,
      imageZoom: typeof imageZoom === "number" ? imageZoom : 1,
      imagePositionX: typeof imagePositionX === "number" ? imagePositionX : 0.5,
      imagePositionY: typeof imagePositionY === "number" ? imagePositionY : 0.5,
      ownerName: ownerName || null,
      ownerPhotoUrl: ownerPhotoUrl || null,
      ownerBio: ownerBio || null,
      ownerValues: ownerValues || null,
      ownerPlaylistUrl: ownerPlaylistUrl || null,
      ownerBlogUrl: ownerBlogUrl || null,
      ownerSocialUrl: ownerSocialUrl || null,
      // '대표 글' 관련 레거시 필드는 Episode로 통합되어 더 이상 이 폼에서 편집하지 않는다.
      // 요청 본문에 값이 없으면(폼이 보내지 않으면) 기존 값을 그대로 보존한다 — 의도치 않은 데이터 삭제 방지.
      ...(philosophy !== undefined ? { philosophy: philosophy || "" } : {}),
      ...(ownerMessage !== undefined ? { ownerMessage: ownerMessage || null } : {}),
      ...(experienceGuide !== undefined ? { experienceGuide: experienceGuide || null } : {}),
      ...(spacePoints !== undefined ? { spacePoints: spacePoints || null } : {}),
      ...(storyItems !== undefined ? { storyItems: storyItems ?? null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) {
    return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.space.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
