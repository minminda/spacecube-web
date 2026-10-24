import { spaceUsable } from "@/lib/demoSpaces";
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

  const space = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { status: true, isDemo: true, slug: true } });
  const preview = isAdmin(session.user.email);
  // 큐레이터 프로토타입 가상 공간은 미리보기 권한(관리자·로컬 개발)이 있을 때만 저장할 수 있다.
  // 시연용 공개 가상 공간(demo- 접두어)은 누구나 저장할 수 있다. 그 밖의 가상 공간(프로토타입)은 미리보기 권한일 때만.
  const demoBlocked = !!space && !spaceUsable(space) && !(preview || process.env.NODE_ENV === "development");
  if (!space || demoBlocked || (space.status !== "PUBLISHED" && !preview)) {
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
  // Cube 상세에서 저장한 같은 공간(운영 공간 SavedSpace)도 함께 해제 — 안 그러면 저장 해제 후에도 저장된 것으로 다시 보인다.
  const space = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { slug: true } });
  if (space) await prisma.savedSpace.deleteMany({ where: { userId: session.user.id, space: { slug: space.slug } } });
  return NextResponse.json({ saved: false });
}
