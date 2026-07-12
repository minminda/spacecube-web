import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

/**
 * 큐브를 공간에 연결한다. 이미 다른 공간에 연결돼 있어도 이 한 번의 update로
 * 새 공간으로 갈아끼운다(최초 연결·공간 변경 모두 동일하게 처리) — 단일 UPDATE라
 * 중간 상태 없이 원자적으로 반영된다. spaceId는 Cube에서 @unique라, 다른 큐브가
 * 이미 그 공간을 차지하고 있으면 DB 제약(P2002)이 최종 방어선이 된다.
 */
export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { spaceId } = (await req.json().catch(() => ({}))) as { spaceId?: string };
  if (!spaceId || typeof spaceId !== "string") {
    return NextResponse.json({ error: "연결할 공간을 선택해주세요." }, { status: 400 });
  }

  const [cube, space] = await Promise.all([
    prisma.cube.findUnique({ where: { id } }),
    prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true, name: true, cube: { select: { id: true, code: true } } },
    }),
  ]);

  if (!cube) return NextResponse.json({ error: "큐브를 찾을 수 없어요." }, { status: 404 });
  if (cube.status === "DISABLED") {
    return NextResponse.json({ error: "비활성화된 큐브는 연결할 수 없어요. 먼저 다시 활성화해주세요." }, { status: 400 });
  }
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
  if (space.cube && space.cube.id !== cube.id) {
    return NextResponse.json({ error: `이미 ${space.cube.code} 큐브가 '${space.name}'에 연결되어 있어요.` }, { status: 409 });
  }

  try {
    const updated = await prisma.cube.update({
      where: { id },
      data: { spaceId, status: "ASSIGNED", activatedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "다른 큐브가 이 공간에 먼저 연결되었어요. 새로고침 후 다시 시도해주세요." }, { status: 409 });
    }
    throw err;
  }
}
