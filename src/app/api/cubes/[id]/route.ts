import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

// 큐브 영구 삭제. ASSIGNED 상태는 먼저 연결 해제/비활성화를 거치게 강제한다 — 인쇄돼 설치된
// QR이 갑자기 아무 의미 없는 코드가 되는 걸 막기 위함. SpaceScan/SpaceUnlock의 cubeId는
// onDelete: SetNull이라 스캔·잠금 이력은 삭제되지 않고 남는다(prisma/schema.prisma 참고).
export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cube = await prisma.cube.findUnique({ where: { id } });
  if (!cube) return NextResponse.json({ error: "큐브를 찾을 수 없어요." }, { status: 404 });
  if (cube.status === "ASSIGNED") {
    return NextResponse.json({ error: "연결된 큐브는 삭제할 수 없어요. 먼저 연결을 해제해주세요." }, { status: 400 });
  }

  await prisma.cube.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
