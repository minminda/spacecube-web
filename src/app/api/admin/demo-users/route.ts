import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin, getAdminEmails } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BATCH = 500;

/**
 * 더미(시연) 계정 지정/해제(User.isDemo) — 관리자 전용. 계정·기록·방명록은 지우지 않는다.
 * body: { isDemo: boolean, userIds?: string[], identifier?: string }
 *   - userIds: 목록에서 고른 계정(일괄 해제 등)
 *   - identifier: 이메일 또는 닉네임 정확히 일치 1명(새로 시연 계정으로 지정할 때)
 * 관리자 계정은 시연 계정으로 지정할 수 없다 — 관리자는 이미 KPI에서 따로 제외되고, 시연 계정으로
 * 만들면 실제 공간에서 관리자의 방명록 글이 숨겨지는 부작용만 생긴다.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { isDemo?: unknown; userIds?: unknown; identifier?: unknown };
  if (typeof body.isDemo !== "boolean") {
    return NextResponse.json({ error: "isDemo는 boolean이어야 해요." }, { status: 400 });
  }

  let ids: string[] = [];
  if (Array.isArray(body.userIds)) {
    ids = body.userIds.filter((v): v is string => typeof v === "string" && v.length > 0);
    if (ids.length === 0 || ids.length > MAX_BATCH) {
      return NextResponse.json({ error: `계정은 1~${MAX_BATCH}개까지 한 번에 바꿀 수 있어요.` }, { status: 400 });
    }
  } else if (typeof body.identifier === "string" && body.identifier.trim()) {
    const identifier = body.identifier.trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: { equals: identifier, mode: "insensitive" } }, { nickname: identifier }] },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "이메일 또는 닉네임이 정확히 일치하는 계정이 없어요." }, { status: 404 });
    ids = [user.id];
  } else {
    return NextResponse.json({ error: "userIds 또는 identifier가 필요해요." }, { status: 400 });
  }

  if (body.isDemo) {
    const adminEmails = getAdminEmails();
    const adminHit = adminEmails.length > 0
      ? await prisma.user.count({ where: { id: { in: ids }, email: { in: adminEmails, mode: "insensitive" } } })
      : 0;
    if (adminHit > 0) {
      return NextResponse.json({ error: "관리자 계정은 시연 계정으로 지정할 수 없어요." }, { status: 400 });
    }
  }

  const result = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { isDemo: body.isDemo } });
  return NextResponse.json({ updated: result.count, userIds: ids, isDemo: body.isDemo });
}
