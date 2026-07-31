import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateQuestionContent, isDuplicateQuestion } from "@/lib/interviewInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ topicId: string }> }

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;
  const topic = await prisma.interviewTopic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!topic) return NextResponse.json({ error: "주제를 찾을 수 없어요." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const validation = validateQuestionContent(content);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const existing = await prisma.interviewQuestion.findMany({ where: { topicId }, select: { content: true } });
  if (isDuplicateQuestion(content, existing.map((q) => q.content))) {
    return NextResponse.json({ error: "이미 같은 질문이 있어요." }, { status: 400 });
  }

  const count = await prisma.interviewQuestion.count({ where: { topicId } });

  const question = await prisma.interviewQuestion.create({
    data: { topicId, content, displayOrder: count },
  });

  return NextResponse.json(question, { status: 201 });
}
