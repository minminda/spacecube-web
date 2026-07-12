import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cube = await prisma.cube.findUnique({ where: { id } });
  if (!cube) return NextResponse.json({ error: "큐브를 찾을 수 없어요." }, { status: 404 });
  if (!cube.spaceId) {
    return NextResponse.json({ error: "이미 연결이 해제된 큐브예요." }, { status: 400 });
  }

  const updated = await prisma.cube.update({
    where: { id },
    data: { spaceId: null, status: "UNASSIGNED", activatedAt: null },
  });
  return NextResponse.json(updated);
}
