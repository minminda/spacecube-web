import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { parseGuestbookCanvasSettingsInput, normalizeCanvasSettingsRow } from "@/lib/guestbookSettingsInput";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

/** 관리자 전용 — spaceId 제한 없이 전체 공간에 접근 가능. 운영자용은 requireOperatorSpace로
 * 게이트한 /api/operator/spaces/[spaceId]/guestbook-settings가 같은 파서를 공유한다. */
export async function PUT(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });

  const existing = await prisma.guestbookSettings.findUnique({ where: { spaceId } });

  const body = await req.json().catch(() => ({}));
  const data = parseGuestbookCanvasSettingsInput(body, normalizeCanvasSettingsRow(existing));

  const settings = await prisma.guestbookSettings.upsert({
    where: { spaceId },
    update: data,
    create: { spaceId, ...data },
  });

  return NextResponse.json(settings);
}
