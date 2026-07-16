import { NextResponse } from "next/server";
import { DistrictStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!name) return NextResponse.json({ error: "지역명은 필수예요." }, { status: 400 });
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "slug는 영문 소문자/숫자/하이픈만 가능해요." }, { status: 400 });
  }

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
