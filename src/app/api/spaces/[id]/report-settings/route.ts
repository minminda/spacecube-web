import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// 리포트 시작일/주기 설정은 공간큐브 관리자만 — 운영자는 조회만 가능(스펙 요구사항).
export async function PUT(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const reportStartDate =
    typeof body.reportStartDate === "string" && body.reportStartDate ? new Date(body.reportStartDate) : null;
  if (body.reportStartDate && (!reportStartDate || Number.isNaN(reportStartDate.getTime()))) {
    return NextResponse.json({ error: "reportStartDate 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const data = {
    reportStartDate,
    reportTimezone: typeof body.reportTimezone === "string" && body.reportTimezone ? body.reportTimezone : "Asia/Seoul",
    reportEnabled: typeof body.reportEnabled === "boolean" ? body.reportEnabled : false,
    operatorNotifyEmail: typeof body.operatorNotifyEmail === "string" && body.operatorNotifyEmail ? body.operatorNotifyEmail : null,
    operatorNotifyPhone: typeof body.operatorNotifyPhone === "string" && body.operatorNotifyPhone ? body.operatorNotifyPhone : null,
  };

  const updated = await prisma.space.update({ where: { id: spaceId }, data });

  return NextResponse.json({
    reportStartDate: updated.reportStartDate?.toISOString() ?? null,
    reportTimezone: updated.reportTimezone,
    reportEnabled: updated.reportEnabled,
    operatorNotifyEmail: updated.operatorNotifyEmail,
    operatorNotifyPhone: updated.operatorNotifyPhone,
  });
}
