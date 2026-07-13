import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { GuestbookSessionStatus } from "@prisma/client";

interface Props {
  params: Promise<{ spaceId: string }>;
}

const MAX_QUESTION_LEN = 200;

function serializeDraft(draft: {
  id: string;
  question1: string | null;
  question2: string | null;
  freeClusterX: number;
  freeClusterY: number;
  question1ClusterX: number;
  question1ClusterY: number;
  question2ClusterX: number;
  question2ClusterY: number;
}) {
  return {
    id: draft.id,
    question1: draft.question1,
    question2: draft.question2,
    freeClusterX: draft.freeClusterX,
    freeClusterY: draft.freeClusterY,
    question1ClusterX: draft.question1ClusterX,
    question1ClusterY: draft.question1ClusterY,
    question2ClusterX: draft.question2ClusterX,
    question2ClusterY: draft.question2ClusterY,
  };
}

async function authorize(req: Request, spaceId: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  const access = await requireSpaceAccess(user.id, user.email, spaceId);
  if (!access.ok) return { error: NextResponse.json({ error: "Forbidden" }, { status: access.status }) };
  return { user };
}

// 다음 방명록 준비 중인 DRAFT 세션 조회 — 없으면 아직 준비를 시작 안 한 상태.
export async function GET(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  const auth_ = await authorize(req, spaceId);
  if ("error" in auth_) return auth_.error;

  const draft = await prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } });
  return NextResponse.json({ draft: draft ? serializeDraft(draft) : null });
}

// 질문1/2 임시 저장 — 새 방명록 시작과는 분리된 동작(캔버스 배치와도 분리).
export async function PUT(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  const auth_ = await authorize(req, spaceId);
  if ("error" in auth_) return auth_.error;

  const body = await req.json().catch(() => ({}));
  const q1 = typeof body.question1 === "string" && body.question1.trim() ? body.question1.trim().slice(0, MAX_QUESTION_LEN) : null;
  const q2 = typeof body.question2 === "string" && body.question2.trim() ? body.question2.trim().slice(0, MAX_QUESTION_LEN) : null;

  const existing = await prisma.guestbookSession.findFirst({ where: { spaceId, status: GuestbookSessionStatus.DRAFT } });
  const draft = existing
    ? await prisma.guestbookSession.update({ where: { id: existing.id }, data: { question1: q1, question2: q2 } })
    : await prisma.guestbookSession.create({ data: { spaceId, status: GuestbookSessionStatus.DRAFT, question1: q1, question2: q2 } });

  return NextResponse.json({ draft: serializeDraft(draft) });
}
