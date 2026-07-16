import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { GuestbookSessionStatus } from "@prisma/client";
import { parseGuestbookSessionInput, DEFAULT_SESSION_FIELDS } from "@/lib/guestbookSessionInput";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 다음 방명록(DRAFT)의 질문/표시여부/위치/스타일을 저장한다 — 없으면 새로 만들고, 있으면
 * 갱신한다(upsert). 관리자 전용. 옛 운영자용 draft/route.ts + draft/clusters/route.ts
 * 두 엔드포인트가 하던 일을 필드 전체로 통합했다(한 번의 저장 버튼으로 전부 저장).
 */
export async function PUT(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const existing = await prisma.guestbookSession.findFirst({
    where: { spaceId, status: GuestbookSessionStatus.DRAFT },
  });

  const body = await req.json().catch(() => ({}));
  const result = parseGuestbookSessionInput(body, existing ?? DEFAULT_SESSION_FIELDS);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const draft = existing
    ? await prisma.guestbookSession.update({ where: { id: existing.id }, data: result.data })
    : await prisma.guestbookSession.create({
        data: { spaceId, status: GuestbookSessionStatus.DRAFT, ...result.data },
      });

  return NextResponse.json(draft);
}
