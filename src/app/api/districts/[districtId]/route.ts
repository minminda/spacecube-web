import { invalidateSearchCorpus } from "@/lib/search/searchData";
import { NextResponse } from "next/server";
import { DistrictStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cleanRegionName, countSpacesInRegion, findRegionConflict } from "@/lib/regions";
import { getUsedAreaValues } from "@/lib/regionAdmin";
import { sameArea } from "@/lib/editorial/area";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ districtId: string }> }

const SLUG_RE = /^[a-z0-9-]+$/;

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { districtId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  let renameFrom: string | null = null;
  if (typeof body.name === "string") {
    const name = cleanRegionName(body.name);
    if (!name) return NextResponse.json({ error: "지역명은 비울 수 없어요." }, { status: 400 });
    const all = await prisma.district.findMany({ select: { id: true, name: true } });
    const current = all.find((d) => d.id === districtId);
    if (!current) return NextResponse.json({ error: "지역을 찾을 수 없어요." }, { status: 404 });
    const conflict = findRegionConflict(name, all, districtId);
    if (conflict) return NextResponse.json({ error: `이미 '${conflict.name}' 지역이 있어요. 같은 동네는 한 번만 등록할 수 있어요.` }, { status: 409 });
    data.name = name;
    if (name !== current.name) renameFrom = current.name;
  }
  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase();
    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "slug는 영문 소문자/숫자/하이픈만 가능해요." }, { status: 400 });
    }
    data.slug = slug;
  }
  if ("tagline" in body) data.tagline = body.tagline || null;
  if (typeof body.status === "string") {
    if (!Object.values(DistrictStatus).includes(body.status as DistrictStatus)) {
      return NextResponse.json({ error: "status가 올바르지 않아요." }, { status: 400 });
    }
    data.status = body.status;
  }
  for (const key of ["markerX", "markerY", "zoomX", "zoomY", "zoomScale"] as const) {
    if (key in body) {
      if (typeof body[key] !== "number" || !Number.isFinite(body[key])) {
        return NextResponse.json({ error: `${key}는 숫자여야 해요.` }, { status: 400 });
      }
      data[key] = body[key];
    }
  }

  // 이름을 바꾸면 그 지역을 쓰던 공간(운영 공간 district · 공간 등록 area)도 같은 이름으로 맞춘다 —
  // 문자열 조인이라 따라 바꾸지 않으면 공간이 지역에서 빠진다. 한 트랜잭션으로 처리.
  let renamedSpaces = 0;
  if (renameFrom) {
    const from = renameFrom;
    const to = data.name as string;
    const [spaces, editorial] = await Promise.all([
      prisma.space.findMany({ where: { district: { not: null } }, select: { id: true, district: true } }),
      prisma.editorialSpace.findMany({ select: { id: true, area: true } }),
    ]);
    const spaceIds = spaces.filter((s) => sameArea(s.district, from)).map((s) => s.id);
    const editorialIds = editorial.filter((e) => sameArea(e.area, from)).map((e) => e.id);
    const [district] = await prisma.$transaction([
      prisma.district.update({ where: { id: districtId }, data }),
      prisma.space.updateMany({ where: { id: { in: spaceIds } }, data: { district: to } }),
      prisma.editorialSpace.updateMany({ where: { id: { in: editorialIds } }, data: { area: to } }),
    ]);
    renamedSpaces = new Set([...spaceIds, ...editorialIds]).size;
    invalidateSearchCorpus();
    return NextResponse.json({ ...district, renamedSpaces });
  }

  const district = await prisma.district.update({ where: { id: districtId }, data });
  invalidateSearchCorpus();
  return NextResponse.json({ ...district, renamedSpaces });
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { districtId } = await params;
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) return NextResponse.json({ error: "지역을 찾을 수 없어요." }, { status: 404 });

  // 지역을 쓰는 공간이 있으면 확인 없이는 지우지 않는다. 지역 항목만 지워지고 공간의 지역 값은 그대로 남는다.
  const inUse = countSpacesInRegion(district.name, await getUsedAreaValues());
  if (inUse > 0 && new URL(req.url).searchParams.get("confirm") !== "1") {
    return NextResponse.json({ error: `현재 ${inUse}개의 공간이 이 지역을 사용하고 있습니다.`, inUse }, { status: 409 });
  }
  await prisma.district.delete({ where: { id: districtId } });
  return NextResponse.json({ ok: true });
}
