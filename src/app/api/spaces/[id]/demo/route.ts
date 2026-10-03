import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

/**
 * 시연·테스트 공간 지정/해제(Space.isDemo) — 관리자 전용. 데이터는 지우지 않고 공개 목록·검색·
 * 추천·전체 KPI 합계에서만 빠진다(src/lib/demoData.ts). isActive(공개/비공개)와는 독립이다.
 */
export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { isDemo } = await req.json().catch(() => ({})) as { isDemo?: unknown };
  if (typeof isDemo !== "boolean") {
    return NextResponse.json({ error: "isDemo는 boolean이어야 해요." }, { status: 400 });
  }

  const exists = await prisma.space.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const updated = await prisma.space.update({ where: { id }, data: { isDemo }, select: { id: true, isDemo: true } });
  return NextResponse.json(updated);
}
