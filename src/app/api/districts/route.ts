import { NextResponse } from "next/server";
import { DistrictStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cleanRegionName, findRegionConflict, makeRegionSlug } from "@/lib/regions";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = cleanRegionName(body.name);
  if (!name) return NextResponse.json({ error: "지역명을 입력해주세요." }, { status: 400 });

  const existing = await prisma.district.findMany({ select: { id: true, name: true, slug: true } });
  const conflict = findRegionConflict(name, existing);
  if (conflict) return NextResponse.json({ error: `이미 '${conflict.name}' 지역이 있어요. 같은 동네는 한 번만 등록할 수 있어요.` }, { status: 409 });

  // slug는 사용자 화면 주소용 내부 값 — 직접 주면 검증하고, 없으면 자동 생성한다.
  const given = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (given && !SLUG_RE.test(given)) {
    return NextResponse.json({ error: "slug는 영문 소문자/숫자/하이픈만 가능해요." }, { status: 400 });
  }
  const taken = new Set(existing.map((d) => d.slug));
  const slug = given || makeRegionSlug(name, taken);
  if (taken.has(slug)) return NextResponse.json({ error: "이미 쓰는 slug예요." }, { status: 409 });

  const count = await prisma.district.count();

  const district = await prisma.district.create({
    data: {
      name,
      slug,
      tagline: body.tagline || null,
      status: Object.values(DistrictStatus).includes(body.status) ? body.status : DistrictStatus.HIDDEN,
      order: count,
      markerX: Number.isFinite(body.markerX) ? body.markerX : undefined,
      markerY: Number.isFinite(body.markerY) ? body.markerY : undefined,
      zoomX: Number.isFinite(body.zoomX) ? body.zoomX : undefined,
      zoomY: Number.isFinite(body.zoomY) ? body.zoomY : undefined,
      zoomScale: Number.isFinite(body.zoomScale) ? body.zoomScale : undefined,
    },
  });

  return NextResponse.json(district, { status: 201 });
}
