import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getCompletedPeriods } from "@/lib/reportPeriod";
import { generateOrGetMonthlyReport } from "@/lib/monthlyReport";

interface Props {
  params: Promise<{ spaceId: string }>;
}

// 관리자 전용 수동 리포트 생성 버튼 — 완료된(공개일이 지난) 구간 중 아직 생성 안 된 것들을 전부 만든다.
// generateOrGetMonthlyReport가 idempotent라 이미 있는 기간은 그대로 반환되고 중복 생성되지 않는다.
export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) {
    return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
  }
  if (!space.reportStartDate) {
    return NextResponse.json({ error: "리포트 시작일이 설정되지 않았습니다." }, { status: 400 });
  }

  const completed = getCompletedPeriods(space.reportStartDate);
  if (completed.length === 0) {
    return NextResponse.json({ error: "아직 완료된 집계 기간이 없습니다." }, { status: 400 });
  }

  const reports = [];
  for (const period of completed) {
    const report = await generateOrGetMonthlyReport(spaceId, period.start, period.end);
    reports.push({ id: report.id, periodStart: report.periodStart.toISOString(), periodEnd: report.periodEnd.toISOString() });
  }

  return NextResponse.json({ generated: reports.length, reports });
}
