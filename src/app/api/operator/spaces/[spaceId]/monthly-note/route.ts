import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";

interface Props {
  params: Promise<{ spaceId: string }>;
}

const MAX_NOTE_LEN = 2000;

// 월간 운영 메모 — 공간+리포트당 공유 메모 1개(PIN으로 접근한 사람은 누구나 같은 메모를 본다).
export async function GET(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reportId = req.nextUrl.searchParams.get("reportId");
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

  const note = await prisma.operatorMonthlyNote.findUnique({
    where: { monthlyReportId: reportId },
  });
  return NextResponse.json({ content: note?.content ?? "" });
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reportId = req.nextUrl.searchParams.get("reportId");
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

  const report = await prisma.spaceMonthlyReport.findUnique({ where: { id: reportId } });
  if (!report || report.spaceId !== spaceId) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.slice(0, MAX_NOTE_LEN) : "";

  const note = await prisma.operatorMonthlyNote.upsert({
    where: { monthlyReportId: reportId },
    update: { content },
    create: { monthlyReportId: reportId, spaceId, content },
  });

  return NextResponse.json({ content: note.content });
}
