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
    spaceTags,
    imageUrl,
  } = await req.json();

  const updated = await prisma.space.update({
    where: { id },
    data: {
      name, type, district, location,
      tagline: tagline || null,
      openingHours: openingHours || null,
      naverMapUrl: naverMapUrl || null,
      description, philosophy,
      ownerMessage: ownerMessage || null,
      experienceGuide: experienceGuide || null,
      spacePoints: spacePoints || null,
      spaceTags: spaceTags ?? [],
      imageUrl: imageUrl || null,
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
