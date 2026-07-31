import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateQuestionContent, validateInterviewNote, isDuplicateQuestion } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ questionId: string }> }

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await params;
  const question = await prisma.interviewQuestion.findUnique({ where: { id: questionId }, select: { topicId: true, content: true } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.content === "string") {
    const content = body.content.trim();
    const validation = validateQuestionContent(content);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const siblings = await prisma.interviewQuestion.findMany({
      where: { topicId: question.topicId, id: { not: questionId } },
      select: { content: true },
    });
    if (isDuplicateQuestion(content, siblings.map((q) => q.content))) {
      return NextResponse.json({ error: "이미 같은 질문이 있어요." }, { status: 400 });
    }
    data.content = content;
  }

  if ("interviewNote" in body) {
    const note = typeof body.interviewNote === "string" ? body.interviewNote.trim() : "";
    const validation = validateInterviewNote(note);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    data.interviewNote = note || null;
  }

  const updated = await prisma.interviewQuestion.update({ where: { id: questionId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await params;
  const question = await prisma.interviewQuestion.findUnique({ where: { id: questionId }, select: { topicId: true } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.interviewQuestion.delete({ where: { id: questionId } });

  const remaining = await prisma.interviewQuestion.findMany({
    where: { topicId: question.topicId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((q, i) => prisma.interviewQuestion.update({ where: { id: q.id }, data: { displayOrder: i } }))
  );

  return NextResponse.json({ ok: true });
}
