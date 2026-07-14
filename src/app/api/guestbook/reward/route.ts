import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildRewardSummary } from "@/lib/guestbookReward";

/**
 * 방명록 캔버스를 "다음으로"로 나갈 때 호출한다 — 포스트잇 작성 여부와 무관하게,
 * 이 공간에 대한 취향 점수(Record)만 있으면 추천/취향 업데이트 요약을 계산해 돌려준다.
 * 추천 로직 자체는 buildRewardSummary(기존 done 화면·아카이브와 동일한 최신 점수 정책)를 그대로 재사용한다.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spaceId = req.nextUrl.searchParams.get("spaceId");
  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hasRecord = await prisma.record.findFirst({
    where: { userId: user.id, spaceId },
    select: { id: true },
  });
  if (!hasRecord) {
    return NextResponse.json({ error: "이 공간에 대한 기록을 먼저 남겨주세요." }, { status: 403 });
  }

  const rewardSummary = await buildRewardSummary(user.id, spaceId);
  return NextResponse.json(rewardSummary);
}
