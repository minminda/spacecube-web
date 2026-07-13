import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getCompletedPeriods } from "@/lib/reportPeriod";
import { generateOrGetMonthlyReport } from "@/lib/monthlyReport";

interface NotificationPayload {
  spaceId: string;
  spaceName: string;
  operatorNotifyEmail: string | null;
  operatorNotifyPhone: string | null;
  periodStart: string;
  periodEnd: string;
  url: string;
}

/**
 * Vercel Cron에서 호출할 보호된 엔드포인트 — CRON_SECRET(Authorization: Bearer)로 인증한다.
 * reportEnabled=true인 공간 중, 공개일이 지났지만 아직 생성되지 않은 리포트만 생성한다.
 * 문자/이메일 실제 발송은 하지 않고, 이후 알림 시스템이 쓸 수 있도록 payload를 응답 + 로그로 남긴다.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spaces = await prisma.space.findMany({
    where: { reportEnabled: true, reportStartDate: { not: null } },
  });

  const notifications: NotificationPayload[] = [];

  for (const space of spaces) {
    if (!space.reportStartDate) continue;
    const completedPeriods = getCompletedPeriods(space.reportStartDate);

    for (const period of completedPeriods) {
      const existing = await prisma.spaceMonthlyReport.findUnique({
        where: { spaceId_periodStart: { spaceId: space.id, periodStart: period.start } },
      });
      if (existing) continue;

      const report = await generateOrGetMonthlyReport(space.id, period.start, period.end);
      notifications.push({
        spaceId: space.id,
        spaceName: space.name,
        operatorNotifyEmail: space.operatorNotifyEmail,
        operatorNotifyPhone: space.operatorNotifyPhone,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        url: `/operator?spaceId=${space.id}&reportId=${report.id}`,
      });
    }
  }

  if (notifications.length > 0) {
    console.log("[cron/monthly-reports] 신규 발행 리포트:", JSON.stringify(notifications));
  }

  return NextResponse.json({ generated: notifications.length, notifications });
}
