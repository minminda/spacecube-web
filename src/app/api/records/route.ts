import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENABLE_RECORD_TAG_SELECTION, ENABLE_TASTE_SCORE_RECOMMENDATION } from "@/lib/features";
import { recomputeSpaceKPI } from "@/lib/kpi";
import { requireSpaceUnlock, canBypassSpaceLock } from "@/lib/spaceUnlock";
import { upsertCurrentRecord } from "@/lib/recordVisit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId, tags, memo, tasteScore } = await req.json();

  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  // 신규 UX: 취향 적합도 1~5 필수
  const validScore =
    typeof tasteScore === "number" && Number.isInteger(tasteScore) && tasteScore >= 1 && tasteScore <= 5
      ? tasteScore
      : null;

  if (ENABLE_TASTE_SCORE_RECOMMENDATION && validScore === null) {
    return NextResponse.json({ error: "tasteScore (1~5) is required" }, { status: 400 });
  }

  // 레거시 UX: 태그 선택 필수 (ENABLE_RECORD_TAG_SELECTION 켜졌을 때만)
  if (ENABLE_RECORD_TAG_SELECTION && (!tags || tags.length === 0)) {
    return NextResponse.json({ error: "tags are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, ownerId: true } });
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  // 취향 점수 저장(Record 생성/갱신)은 공간의 이야기를 여는 관문이다 — 실제 Cube QR을 인식해
  // 이 공간의 SpaceUnlock을 받은 사용자만 저장할 수 있다(관리자·해당 공간 운영자는 예외).
  const bypass = canBypassSpaceLock(session.user.email, space, user.id);
  if (!bypass && !(await requireSpaceUnlock(user.id, spaceId))) {
    return NextResponse.json(
      { error: "이 공간은 아직 잠겨 있어요. 공간에 놓인 큐브의 QR을 스캔해주세요." },
      { status: 403 },
    );
  }

  // 재방문 인정 기준(REVISIT_INTERVAL_HOURS)과 advisory lock 경쟁 방지는 방명록 첫 진입 시
  // 조용히 Record를 확보하는 경로와 공유한다 — src/lib/recordVisit.ts 참고.
  const { record, isNew } = await upsertCurrentRecord(user.id, spaceId, {
    memo,
    tasteScore: validScore,
    tags: ENABLE_RECORD_TAG_SELECTION && tags?.length > 0 ? tags : undefined,
  });

  await recomputeSpaceKPI(spaceId);
  return NextResponse.json(record, { status: isNew ? 201 : 200 });
}
