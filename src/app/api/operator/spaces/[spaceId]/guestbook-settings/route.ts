import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperatorSpace } from "@/lib/operatorSession";
import { parseGuestbookCanvasSettingsInput, normalizeCanvasSettingsRow } from "@/lib/guestbookSettingsInput";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ spaceId: string }>;
}

/**
 * 운영자용 방명록 캔버스 설정(배경·레이아웃·초기 카메라 등) — 자기 공간에 한해서만.
 * 관리자용 /api/spaces/[id]/guestbook-settings와 완전히 같은 파서(guestbookSettingsInput.ts)를
 * 공유한다 — 필드 범위 차이 없음, 인가 게이트(공간 범위)만 다르다.
 */
export async function PUT(req: NextRequest, { params }: Props) {
  const { spaceId } = await params;
  if (!(await requireOperatorSpace(spaceId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
