import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { computeReportStartDateForPreset, type ReportDayPreset } from "@/lib/reportPeriod";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function parsePreset(value: unknown): ReportDayPreset {
  if (value === 1 || value === 15) return value;
  return "last";
}

// 리포트 발송 여부/기준일은 공간큐브 관리자만 — 운영자는 조회만 가능(스펙 요구사항).
// 발송 이메일은 별도 입력을 받지 않는다 — 관리자 페이지가 Space.owner의 계정 이메일을 그대로
// 보여준다(운영자 계정이 곧 발송 대상이므로 중복 입력 필드를 두지 않는다).
export async function PUT(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true, reportStartDate: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reportEnabled = typeof body.reportEnabled === "boolean" ? body.reportEnabled : false;

  // dayPreset이 오면 그 프리셋으로 reportStartDate를 (재)계산한다 — 매번 "오늘 기준 이번 달의
  // N일"로 다시 잡는다(addMonthsClamped가 말일 클램프를 알아서 처리하므로 별도 로직 불필요).
  const reportStartDate = "dayPreset" in body ? computeReportStartDateForPreset(parsePreset(body.dayPreset)) : space.reportStartDate;

  const updated = await prisma.space.update({
    where: { id: spaceId },
    data: { reportEnabled, reportStartDate, reportTimezone: "Asia/Seoul" },
  });

  return NextResponse.json({
    reportEnabled: updated.reportEnabled,
    reportStartDate: updated.reportStartDate?.toISOString() ?? null,
  });
}
