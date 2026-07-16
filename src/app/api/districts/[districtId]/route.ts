import { NextResponse } from "next/server";
import { DistrictStatus } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "지역명은 비울 수 없어요." }, { status: 400 });
    data.name = name;
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

  const district = await prisma.district.update({ where: { id: districtId }, data });
  return NextResponse.json(district);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { districtId } = await params;
  await prisma.district.delete({ where: { id: districtId } });
  return NextResponse.json({ ok: true });
}
