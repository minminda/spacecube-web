import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENABLE_GUESTBOOK_IMAGE } from "@/lib/pilotFlags";
import { ANON_VISITOR_COOKIE } from "@/lib/anonVisitor";

const MAX_CONTENT = 80;

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 작성자 판정 — 로그인 사용자는 userId, 비로그인 방문자는 sc_anon_id 쿠키(httpOnly, 서버만
 * 설정 가능한 난수)로 판정한다. 생성 시(POST /api/guestbook)도 같은 기준을 쓰므로 대칭이다.
 * 익명 식별자만으로는 신원을 증명할 수 없지만, "이 브라우저가 그 글을 쓴 바로 그 브라우저인가"
 * 라는 소유권 판정에는 충분하다 — httpOnly라 JS로 훔칠 수 없고 무작위라 추측 불가능하기 때문.
 */
async function resolveNoteOwnership(note: { userId: string | null; anonId: string | null }) {
  const session = await auth();
  if (session?.user?.id) {
    return { authenticated: true, isOwner: note.userId === session.user.id };
  }
  const anonId = (await cookies()).get(ANON_VISITOR_COOKIE)?.value ?? null;
  return { authenticated: !!anonId, isOwner: !!anonId && note.anonId === anonId };
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  const note = await prisma.guestbookNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const ownership = await resolveNoteOwnership(note);
  if (!ownership.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ownership.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { content?: string; imageUrl?: string | null } = {};

  if ("content" in body) {
    const text = typeof body.content === "string" ? body.content.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (text.length > MAX_CONTENT) {
      return NextResponse.json({ error: `content must be ${MAX_CONTENT} characters or less` }, { status: 400 });
    }
    data.content = text;
  }

  // 파일럿 기간 이미지 첨부 비활성 — 이미지 필드 변경 요청은 무시한다(기존 값은 그대로 보존).
  if (ENABLE_GUESTBOOK_IMAGE && "imageUrl" in body) {
    data.imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
  }

  const updated = await prisma.guestbookNote.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, content: updated.content, imageUrl: updated.imageUrl });
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  const note = await prisma.guestbookNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const ownership = await resolveNoteOwnership(note);
  if (!ownership.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ownership.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.guestbookNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
