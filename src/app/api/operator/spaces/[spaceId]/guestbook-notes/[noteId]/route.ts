import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string; noteId: string }>;
}

/** 방명록 숨김/숨김 해제 — 운영자는 내용을 고칠 수 없고 노출 여부만 바꿀 수 있다. */
export async function PATCH(req: NextRequest, { params }: Props) {
  const { spaceId, noteId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await prisma.guestbookNote.findUnique({ where: { id: noteId }, select: { spaceId: true, deletedAt: true } });
  if (!note || note.spaceId !== spaceId || note.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const isHidden = typeof body.isHidden === "boolean" ? body.isHidden : true;

  const updated = await prisma.guestbookNote.update({
    where: { id: noteId },
    data: { isHidden, hiddenAt: isHidden ? new Date() : null },
  });
  return NextResponse.json({ id: updated.id, isHidden: updated.isHidden });
}

/** 소프트 삭제 — 실제 행은 남기고 deletedAt만 채운다(복구 UI 없음). */
export async function DELETE(_req: NextRequest, { params }: Props) {
  const { spaceId, noteId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await prisma.guestbookNote.findUnique({ where: { id: noteId }, select: { spaceId: true, deletedAt: true } });
  if (!note || note.spaceId !== spaceId || note.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.guestbookNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
