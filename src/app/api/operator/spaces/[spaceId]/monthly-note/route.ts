import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSpaceAccess } from "@/lib/operatorAuth";

interface Props {
  params: Promise<{ spaceId: string }>;
}

const MAX_NOTE_LEN = 2000;

async function authorize(spaceId: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  const access = await requireSpaceAccess(user.id, user.email, spaceId);
  if (!access.ok) return { error: NextResponse.json({ error: "Forbidden" }, { status: access.status }) };
  return { user };
}

// 월간 운영 메모 — 리포트별 + 운영자 본인 것만 조회/저장(@@unique([monthlyReportId, operatorId])).
export async function GET(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  const result = await authorize(spaceId);
  if ("error" in result) return result.error;

  const reportId = req.nextUrl.searchParams.get("reportId");
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

  const note = await prisma.operatorMonthlyNote.findUnique({
    where: { monthlyReportId_operatorId: { monthlyReportId: reportId, operatorId: result.user.id } },
  });
  return NextResponse.json({ content: note?.content ?? "" });
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  const result = await authorize(spaceId);
  if ("error" in result) return result.error;

  const reportId = req.nextUrl.searchParams.get("reportId");
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

  const report = await prisma.spaceMonthlyReport.findUnique({ where: { id: reportId } });
  if (!report || report.spaceId !== spaceId) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.slice(0, MAX_NOTE_LEN) : "";

  const note = await prisma.operatorMonthlyNote.upsert({
    where: { monthlyReportId_operatorId: { monthlyReportId: reportId, operatorId: result.user.id } },
    update: { content },
    create: { monthlyReportId: reportId, spaceId, operatorId: result.user.id, content },
  });

  return NextResponse.json({ content: note.content });
}
