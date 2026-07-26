import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getCompletedPeriods } from "@/lib/reportPeriod";
import { generateOrGetMonthlyReport, formatPeriodLabel } from "@/lib/monthlyReport";
import { ENABLE_REPORT_EMAIL } from "@/lib/pilotFlags";

interface PendingReportNotification {
  spaceId: string;
  spaceName: string;
  to: string | null;
  subject: string;
  periodStart: string;
  periodEnd: string;
  url: string;
}

/**
 * Vercel Cron에서 호출할 보호된 엔드포인트 — CRON_SECRET(Authorization: Bearer)로 인증한다.
 * reportEnabled=true인 공간 중, 공개일이 지났지만 아직 생성되지 않은 리포트만 생성한다.
 *
 * 실제 SMTP/메일 발송 연동은 아직 없다(이번 작업 범위 밖) — 생성된 SpaceMonthlyReport는
 * 관리자 페이지(/owner/[id]/report)에서 ReportEmail(실제 메일과 동일한 컴포넌트)로 그대로
 * 렌더링해서 볼 수 있으므로, 여기서는 발송 대상/제목/링크만 payload로 남긴다. react-dom/server를
 * 이 라우트에서 직접 import해 HTML을 미리 렌더링하는 방식은 Next.js가 Route Handler 번들에서
 * 금지하고 있어(빌드 에러) 시도하지 않는다 — 실제 발송 연동을 붙일 때 그 서버(예: SMTP
 * 워커/서버리스 함수)에서 ReportEmail을 렌더링하면 된다.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 파일럿 기간: 자동 이메일 발송 비활성 — 리포트 자동 생성/발송 파이프라인을 통째로 멈춘다.
  // 리포트는 관리자 페이지(/owner/[id]/report)에서 수동으로 생성·확인할 수 있다.
  if (!ENABLE_REPORT_EMAIL) {
    return NextResponse.json({ disabled: true, reason: "ENABLE_REPORT_EMAIL=false", generated: 0, notifications: [] });
  }

  const spaces = await prisma.space.findMany({
    where: { reportEnabled: true, reportStartDate: { not: null } },
    include: { owner: { select: { email: true } } },
  });

  const pending: PendingReportNotification[] = [];

  for (const space of spaces) {
    if (!space.reportStartDate) continue;
    const completedPeriods = getCompletedPeriods(space.reportStartDate);

    for (const period of completedPeriods) {
      const existing = await prisma.spaceMonthlyReport.findUnique({
        where: { spaceId_periodStart: { spaceId: space.id, periodStart: period.start } },
      });
      if (existing) continue;

      const report = await generateOrGetMonthlyReport(space.id, period.start, period.end);
      pending.push({
        spaceId: space.id,
        spaceName: space.name,
        to: space.owner?.email ?? space.operatorNotifyEmail,
        subject: `[공간큐브] ${space.name} ${formatPeriodLabel(period.start)} 운영 리포트가 도착했습니다.`,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        url: `/owner/${space.id}/report?reportId=${report.id}`,
      });
    }
  }

  // 프로덕션에서는 리포트 페이로드 전체를 로그에 남기지 않는다(개수만 확인 가능하면 충분).
  const debug = process.env.NODE_ENV !== "production";
  if (debug && pending.length > 0) {
    console.log(`[cron/monthly-reports] 신규 발행 리포트 ${pending.length}건:`, JSON.stringify(pending));
  }

  return NextResponse.json({ generated: pending.length, notifications: pending });
}
