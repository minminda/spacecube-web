import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Ctx { params: Promise<{ spaceId: string }> }

/**
 * 공개 공간(EditorialSpace) 저장/해제 — 로그인 사용자 전용. 응답은 항상 최종 서버 상태({ saved })를
 * 돌려주므로 클라이언트는 낙관적으로 바꾼 뒤 이 값으로 맞춘다. 저장은 발행된 공간만(관리자는 미리보기용으로 초안도).
 */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { spaceId } = await params;

  const space = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { status: true } });
  if (!space || (space.status !== "PUBLISHED" && !isAdmin(session.user.email))) {
    return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.savedEditorialSpace.upsert({
    where: { userId_spaceId: { userId: session.user.id, spaceId } },
    create: { userId: session.user.id, spaceId },
    update: {},
  });
  return NextResponse.json({ saved: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { spaceId } = await params;

  await prisma.savedEditorialSpace.deleteMany({ where: { userId: session.user.id, spaceId } });
  return NextResponse.json({ saved: false });
}
