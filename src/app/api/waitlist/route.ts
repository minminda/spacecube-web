import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// 운영자: 대기 목록 조회
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get("spaceId");
  if (!spaceId) return NextResponse.json({ error: "spaceId required" }, { status: 400 });

  const entries = await prisma.waitlistEntry.findMany({
    where: { spaceId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(entries);
}

// 방문자: 대기 등록 (인증 불필요)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { spaceId, name, phone } = body as { spaceId?: string; name?: string; phone?: string };
  if (!spaceId || !name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "spaceId, name, phone required" }, { status: 400 });
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const entry = await prisma.waitlistEntry.create({
    data: { spaceId, name: name.trim(), phone: phone.trim() },
  });

  return NextResponse.json(entry, { status: 201 });
}
