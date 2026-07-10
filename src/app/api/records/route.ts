import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TagKey } from "@prisma/client";
import { ENABLE_RECORD_TAG_SELECTION, ENABLE_TASTE_SCORE_RECOMMENDATION } from "@/lib/features";
import { isNewVisit } from "@/lib/visit";
import { recomputeSpaceKPI } from "@/lib/kpi";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
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

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 재방문 인정 기준: 마지막으로 인정된 방문(가장 최근 Record)으로부터 REVISIT_INTERVAL_HOURS
  // 이상 지나야 새 방문으로 인정한다. 그 전이면 새 Record를 만들지 않고 같은 방문의 기록을
  // 갱신한다 — 새로고침/반복 접속으로 방문 횟수가 늘어나는 걸 서버에서 막는다.
  const lastRecord = await prisma.record.findFirst({
    where: { userId: user.id, spaceId },
    orderBy: { visitedAt: "desc" },
  });

  if (lastRecord && !isNewVisit(lastRecord.visitedAt)) {
    const updated = await prisma.record.update({
      where: { id: lastRecord.id },
      data: {
        memo: memo || null,
        tasteScore: validScore,
        ...(ENABLE_RECORD_TAG_SELECTION && tags?.length > 0
          ? { tags: { deleteMany: {}, create: tags.map((tag: TagKey) => ({ tag })) } }
          : {}),
      },
    });
    await recomputeSpaceKPI(spaceId);
    return NextResponse.json(updated, { status: 200 });
  }

  const record = await prisma.record.create({
    data: {
      userId: user.id,
      spaceId,
      memo: memo || null,
      tasteScore: validScore,
      // 태그 선택 저장은 플래그 뒤로 보존 — 나중에 재사용 가능
      ...(ENABLE_RECORD_TAG_SELECTION && tags?.length > 0
        ? { tags: { create: tags.map((tag: TagKey) => ({ tag })) } }
        : {}),
    },
  });

  await recomputeSpaceKPI(spaceId);
  return NextResponse.json(record, { status: 201 });
}
