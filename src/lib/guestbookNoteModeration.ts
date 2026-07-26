/* ── 방명록 포스트잇 모더레이션 서비스 함수 (관리자·운영자 공통) ──────────────
   /api/spaces/[id]/guestbook-notes/[noteId](관리자, isAdmin, 전체 공간)와
   /api/operator/spaces/[spaceId]/guestbook-notes/[noteId](운영자, requireOperatorSpace,
   자기 공간만)가 공유하는 단일 처리 지점 — 숨김/숨김해제/소프트삭제 로직이 두 곳에
   중복 구현되지 않는다. spaceId는 호출부(각 라우트)가 이미 인가 게이트를 통과한
   값이지만, 여기서도 note.spaceId와 다시 한 번 대조한다("다른 공간 노트 조작 방지"
   방어선을 서비스 함수 자체에 둔다). ── */

import { prisma } from "@/lib/prisma";

export type ModerationResult = { ok: true } | { ok: false; reason: "NOT_FOUND" };

async function findOwnedNote(spaceId: string, noteId: string) {
  const note = await prisma.guestbookNote.findUnique({ where: { id: noteId }, select: { spaceId: true, deletedAt: true } });
  if (!note || note.spaceId !== spaceId || note.deletedAt) return null;
  return note;
}

/** 숨김/숨김 해제 — 방문자의 글 내용 자체는 절대 수정하지 않는다. */
export async function setGuestbookNoteHidden(spaceId: string, noteId: string, isHidden: boolean): Promise<ModerationResult> {
  if (!(await findOwnedNote(spaceId, noteId))) return { ok: false, reason: "NOT_FOUND" };
  await prisma.guestbookNote.update({ where: { id: noteId }, data: { isHidden, hiddenAt: isHidden ? new Date() : null } });
  return { ok: true };
}

/** 소프트 삭제 — 실제 행은 남기고 deletedAt만 채운다(복구 UI 없음). */
export async function softDeleteGuestbookNote(spaceId: string, noteId: string): Promise<ModerationResult> {
  if (!(await findOwnedNote(spaceId, noteId))) return { ok: false, reason: "NOT_FOUND" };
  await prisma.guestbookNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  return { ok: true };
}
