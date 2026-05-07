import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

// 최신 노트 1개 (방문자/운영자 공통)
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const note = await prisma.spaceNote.findFirst({
    where: { spaceId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true },
  });
  return NextResponse.json(note ?? null);
}

// 노트 작성 (운영자)
export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await req.json().catch(() => ({})) as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  const note = await prisma.spaceNote.create({
    data: { spaceId: id, content: content.trim() },
    select: { id: true, content: true, createdAt: true },
  });

  return NextResponse.json(note, { status: 201 });
}
