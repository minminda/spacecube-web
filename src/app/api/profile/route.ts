import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseProfileSettings } from "@/lib/profile/publicProfile";

export const dynamic = "force-dynamic";

/**
 * 공개 프로필 설정(본인) — 공개 ON/OFF · 프로필 주소(handle) · 한 줄 소개 · 대표 취향/자주 찾는 지역 표시 여부.
 * 프로필을 켜도 공간은 자동으로 공개되지 않는다(공간별로 /api/profile/spaces).
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { profileHandle: true } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = parseProfileSettings(await req.json().catch(() => null), me.profileHandle);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { profilePublic, handle, bio, showTaste, showAreas } = parsed.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(profilePublic !== undefined ? { profilePublic } : {}),
        ...(handle !== undefined ? { profileHandle: handle } : {}),
        ...(bio !== undefined ? { profileBio: bio } : {}),
        ...(showTaste !== undefined ? { profileShowTaste: showTaste } : {}),
        ...(showAreas !== undefined ? { profileShowAreas: showAreas } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "이미 다른 사람이 쓰고 있는 주소예요." }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
