import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Tag } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, tags, memo } = await req.json();

  if (!spaceId || !tags || tags.length === 0) {
    return NextResponse.json({ error: "spaceId and tags are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.record.findUnique({
    where: { userId_spaceId: { userId: user.id, spaceId } },
  });

  if (existing) {
    // 기존 기록 업데이트
    await prisma.recordTag.deleteMany({ where: { recordId: existing.id } });
    const record = await prisma.record.update({
      where: { id: existing.id },
      data: {
        memo: memo || null,
        visitedAt: new Date(),
        tags: {
          create: tags.map((tag: Tag) => ({ tag })),
        },
      },
    });
    return NextResponse.json(record);
  }

  const record = await prisma.record.create({
    data: {
      userId: user.id,
      spaceId,
      memo: memo || null,
      tags: {
        create: tags.map((tag: Tag) => ({ tag })),
      },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
