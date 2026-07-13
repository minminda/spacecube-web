import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";
import { computeReportPeriod } from "@/lib/reportPeriod";
import { MonthlyReportStatus, type SpaceMonthlyReport } from "@prisma/client";

interface Props {
  params: Promise<{ spaceId: string }>;
}

function serializeReport(report: SpaceMonthlyReport) {
  return {
    id: report.id,
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    publishedAt: report.publishedAt?.toISOString() ?? null,
    qrUsers: report.qrUsers,
    returningUsers: report.returningUsers,
    revisitRate: report.revisitRate,
    guestbookWriters: report.guestbookWriters,
    guestbookPosts: report.guestbookPosts,
    guestbookRate: report.guestbookRate,
    averageTasteScore: report.averageTasteScore,
    usageSummary: report.usageSummary,
  };
}

export async function GET(req: NextRequest, { params }: Props) {
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
  const { space } = access;

  const requestedReportId = req.nextUrl.searchParams.get("reportId");

  const [latest, requested, pastReports] = await Promise.all([
    prisma.spaceMonthlyReport.findFirst({
      where: { spaceId, status: MonthlyReportStatus.PUBLISHED },
      orderBy: { periodStart: "desc" },
    }),
    requestedReportId ? prisma.spaceMonthlyReport.findUnique({ where: { id: requestedReportId } }) : Promise.resolve(null),
    prisma.spaceMonthlyReport.findMany({
      where: { spaceId, status: MonthlyReportStatus.PUBLISHED },
      orderBy: { periodStart: "desc" },
      select: { id: true, periodStart: true, periodEnd: true },
    }),
  ]);

  const report = requested && requested.spaceId === spaceId ? requested : latest;

  let featuredPosts: {
    rank: number;
    reactionCount: number;
    content: string;
    createdAt: string;
    nickname: string | null;
    clusterType: string;
  }[] = [];

  if (report) {
    const featured = await prisma.monthlyReportFeaturedPost.findMany({
      where: { monthlyReportId: report.id },
      orderBy: { rank: "asc" },
      include: { note: { select: { content: true, createdAt: true, nickname: true, clusterType: true } } },
    });
    featuredPosts = featured.map((f) => ({
      rank: f.rank,
      reactionCount: f.reactionCount,
      content: f.note.content,
      createdAt: f.note.createdAt.toISOString(),
      nickname: f.note.nickname,
      clusterType: f.note.clusterType,
    }));
  }

  let period: { currentPeriodStart: string; currentPeriodEnd: string; nextReportDate: string } | null = null;
  const reportNotStarted = !space.reportEnabled || !space.reportStartDate || space.reportStartDate.getTime() > Date.now();
  if (!reportNotStarted && space.reportStartDate) {
    const p = computeReportPeriod(space.reportStartDate);
    period = {
      currentPeriodStart: p.currentPeriodStart.toISOString(),
      currentPeriodEnd: p.currentPeriodEnd.toISOString(),
      nextReportDate: p.nextReportDate.toISOString(),
    };
  }

  return NextResponse.json({
    space: {
      id: space.id,
      name: space.name,
      reportEnabled: space.reportEnabled,
      reportStartDate: space.reportStartDate?.toISOString() ?? null,
    },
    period,
    report: report ? { ...serializeReport(report), featuredPosts } : null,
    pastReports: pastReports.map((r) => ({
      id: r.id,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
    })),
  });
}
