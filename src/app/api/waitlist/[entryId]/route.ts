import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ entryId: string }> }

// 운영자: 대기 항목 삭제 (호출 완료 처리)
export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;
  await prisma.waitlistEntry.delete({ where: { id: entryId } }).catch(() => null);

  return NextResponse.json({ ok: true });
}

// 운영자: 호출됨 상태로 변경
export async function PATCH(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;
  const entry = await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "CALLED" },
  });

  return NextResponse.json(entry);
}
