import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashOperatorPin, isValidPinFormat } from "@/lib/operatorPin";
import { enforceSingleSelectCategories, resolveSpaceTypeName, type TagLinkInput } from "@/lib/tagLinks";
import { normalizeSlug, isValidSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

function isTagLinkInput(v: unknown): v is TagLinkInput {
  return typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).tagId === "string";
}

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
    ownerName, ownerPhotoUrl, ownerBio,
    ownerValues, ownerPlaylistUrl, ownerBlogUrl, ownerSocialUrl,
    newOperatorPin,
  } = await req.json();

  // "공간 유형" 카테고리 선택이 있으면 Space.type 파생 캐시를 갱신한다. 없으면(빈 tagLinks 등)
  // 기존 값을 그대로 둔다 — 다른 선택 필드처럼 의도치 않은 초기화를 방지한다.
  const rawTagLinks = Array.isArray(tagLinks) ? tagLinks.filter(isTagLinkInput) : [];
  const normalizedLinks = await enforceSingleSelectCategories(rawTagLinks);
  const resolvedType = await resolveSpaceTypeName(normalizedLinks);

  // slug는 값이 온 경우에만 검증/변경한다 — 보내지 않으면(undefined) 기존 값을 그대로 둔다.
  let normalizedSlug: string | null = null;
  if (slug !== undefined) {
    normalizedSlug = normalizeSlug(String(slug));
    if (!isValidSlug(normalizedSlug)) {
      return NextResponse.json({ error: "공간 주소는 영문 소문자, 숫자, 하이픈만 사용할 수 있어요." }, { status: 400 });
    }
    if (normalizedSlug !== space.slug) {
      const duplicate = await prisma.space.findUnique({ where: { slug: normalizedSlug } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: "이미 사용 중인 공간 주소예요." }, { status: 409 });
      }
    }
  }

  let pinUpdateData: { operatorPinHash: string; operatorPinUpdatedAt: Date; operatorAccessVersion: { increment: number } } | null = null;
  if (newOperatorPin !== undefined && newOperatorPin !== "") {
    if (typeof newOperatorPin !== "string" || !isValidPinFormat(newOperatorPin)) {
      return NextResponse.json({ error: "운영 비밀번호는 숫자 4자리여야 해요." }, { status: 400 });
    }
    // PIN 변경 시 operatorAccessVersion을 올려 이미 발급된 운영 세션 쿠키를 전부 무효화한다.
    pinUpdateData = {
      operatorPinHash: await hashOperatorPin(newOperatorPin),
      operatorPinUpdatedAt: new Date(),
      operatorAccessVersion: { increment: 1 },
    };
  }

  const updated = await prisma.space.update({
    where: { id },
    data: {
      name, district, location,
      ...(normalizedSlug !== null ? { slug: normalizedSlug } : {}),
      ...(resolvedType ? { type: resolvedType } : {}),
      tagline: tagline || null,
      openingHours: openingHours || null,
      naverMapUrl: naverMapUrl || null,
      description,
      imageUrl: imageUrl || null,
      imageZoom: typeof imageZoom === "number" ? imageZoom : 1,
      imagePositionX: typeof imagePositionX === "number" ? imagePositionX : 0.5,
      imagePositionY: typeof imagePositionY === "number" ? imagePositionY : 0.5,
      ownerName: ownerName || null,
      ownerPhotoUrl: ownerPhotoUrl || null,
      ownerBio: ownerBio || null,
      // '대표 글' 관련 레거시 필드, 그리고 공간 페이지에서 더 이상 보여주지 않는
      // 가치/링크 필드는 이 폼에서 편집하지 않는다. 요청 본문에 값이 없으면(폼이
      // 보내지 않으면) 기존 값을 그대로 보존한다 — 의도치 않은 데이터 삭제 방지.
      ...(philosophy !== undefined ? { philosophy: philosophy || "" } : {}),
      ...(ownerMessage !== undefined ? { ownerMessage: ownerMessage || null } : {}),
      ...(experienceGuide !== undefined ? { experienceGuide: experienceGuide || null } : {}),
      ...(spacePoints !== undefined ? { spacePoints: spacePoints || null } : {}),
      ...(storyItems !== undefined ? { storyItems: storyItems ?? null } : {}),
      ...(ownerValues !== undefined ? { ownerValues: ownerValues || null } : {}),
      ...(ownerPlaylistUrl !== undefined ? { ownerPlaylistUrl: ownerPlaylistUrl || null } : {}),
      ...(ownerBlogUrl !== undefined ? { ownerBlogUrl: ownerBlogUrl || null } : {}),
      ...(ownerSocialUrl !== undefined ? { ownerSocialUrl: ownerSocialUrl || null } : {}),
      ...(pinUpdateData ?? {}),
    },
  });

  await prisma.$transaction([
    prisma.spaceTag.deleteMany({ where: { spaceId: id } }),
    ...(normalizedLinks.length > 0
      ? [prisma.spaceTag.createMany({ data: normalizedLinks.map((l) => ({ spaceId: id, ...l })) })]
      : []),
  ]);

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

  // 공간에 연결된 큐브가 있으면 큐브 자체는 남기고 연결만 해제한다(비활성화 아님, 미등록으로 되돌림).
  await prisma.$transaction([
    prisma.cube.updateMany({ where: { spaceId: id }, data: { spaceId: null, status: "UNASSIGNED", activatedAt: null } }),
    prisma.space.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
