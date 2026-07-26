import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string }>;
}

/** 운영자 셀프서비스 프로필 — 운영자명/연락 이메일/월간 리포트 수신 이메일·수신여부만 바꿀 수 있다. */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    operatorContactName,
    operatorContactEmail,
    operatorReportEmail,
    operatorReportEmailEnabled,
  } = body;

  const updated = await prisma.space.update({
    where: { id: spaceId },
    data: {
      operatorContactName: typeof operatorContactName === "string" ? operatorContactName.trim() || null : null,
      operatorContactEmail: typeof operatorContactEmail === "string" ? operatorContactEmail.trim() || null : null,
      operatorReportEmail: typeof operatorReportEmail === "string" ? operatorReportEmail.trim() || null : null,
      operatorReportEmailEnabled: typeof operatorReportEmailEnabled === "boolean" ? operatorReportEmailEnabled : true,
    },
    select: {
      operatorContactName: true,
      operatorContactEmail: true,
      operatorReportEmail: true,
      operatorReportEmailEnabled: true,
    },
  });

  return NextResponse.json(updated);
}
