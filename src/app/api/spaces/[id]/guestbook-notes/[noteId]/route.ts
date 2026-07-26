import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { setGuestbookNoteHidden, softDeleteGuestbookNote } from "@/lib/guestbookNoteModeration";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string; noteId: string }>;
}

/**
 * 관리자용 방명록 노트 숨김/숨김 해제 — spaceId 제한 없이 전체 공간에 접근 가능하다.
 * 운영자용(requireOperatorSpace, 자기 공간만)과 동일한 서비스 함수
 * (guestbookNoteModeration.ts)를 공유하고, 인가 게이트만 다르다.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId, noteId } = await params;
  const body = await req.json().catch(() => ({}));
  const isHidden = typeof body.isHidden === "boolean" ? body.isHidden : true;

  const result = await setGuestbookNoteHidden(spaceId, noteId, isHidden);
  if (!result.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: noteId, isHidden });
}

/** 소프트 삭제 — 관리자 전용, 전체 공간 접근 가능. */
export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId, noteId } = await params;
  const result = await softDeleteGuestbookNote(spaceId, noteId);
  if (!result.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
