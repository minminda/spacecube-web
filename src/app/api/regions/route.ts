import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_SAVED_REGIONS, cleanRegion } from "@/lib/regions/saved";

export const dynamic = "force-dynamic";

/**
 * 관심 지역 별표 저장 { area, saved } — 로그인 사용자만(비로그인은 브라우저 쿠키에 저장하므로 이 API를 쓰지 않는다).
 * 지역 이름은 normalizeArea로 정리한 값("연남동" → "연남")으로 저장하고, 몇 번 눌러도 같은 결과다(upsert · deleteMany).
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => null)) as { area?: unknown; saved?: unknown } | null;
  const area = cleanRegion(typeof body?.area === "string" ? body.area : null);
  if (!body || !area || typeof body.saved !== "boolean") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (!body.saved) {
    await prisma.savedRegion.deleteMany({ where: { userId, area } });
    return NextResponse.json({ ok: true, saved: false });
  }

  const existing = await prisma.savedRegion.findUnique({ where: { userId_area: { userId, area } }, select: { id: true } });
  if (!existing) {
    const count = await prisma.savedRegion.count({ where: { userId } });
    if (count >= MAX_SAVED_REGIONS) {
      return NextResponse.json({ error: `관심 지역은 ${MAX_SAVED_REGIONS}곳까지 저장할 수 있어요.` }, { status: 400 });
    }
    await prisma.savedRegion.create({ data: { userId, area } });
  }
  return NextResponse.json({ ok: true, saved: true });
}
