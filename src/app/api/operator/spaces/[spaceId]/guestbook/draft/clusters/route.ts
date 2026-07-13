import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ spaceId: string }>;
}

const CLUSTER_KEYS = [
  "freeClusterX",
  "freeClusterY",
  "question1ClusterX",
  "question1ClusterY",
  "question2ClusterX",
  "question2ClusterY",
] as const;

// 운영자용 무한 캔버스 배치 모드가 저장하는 군집 좌표(월드 좌표, WORLD_W/H=5000 기준).
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { spaceId } = await params;
  const access = await requireSpaceAccess(user.id, user.email, spaceId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, number> = {};
  for (const key of CLUSTER_KEYS) {
    if (typeof body[key] === "number" && Number.isFinite(body[key])) {
      data[key] = body[key];
    }
  }

  const existing = await prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } });
  const draft = existing
    ? await prisma.guestbookSession.update({ where: { id: existing.id }, data })
    : await prisma.guestbookSession.create({ data: { spaceId, status: GuestbookSessionStatus.DRAFT, ...data } });

  return NextResponse.json({
    id: draft.id,
    freeClusterX: draft.freeClusterX,
    freeClusterY: draft.freeClusterY,
    question1ClusterX: draft.question1ClusterX,
    question1ClusterY: draft.question1ClusterY,
    question2ClusterX: draft.question2ClusterX,
    question2ClusterY: draft.question2ClusterY,
  });
}
