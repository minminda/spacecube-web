import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/archive/library";

export const dynamic = "force-dynamic";

/**
 * 공간 하나를 공개 프로필에 보이기/숨기기 { spaceId, public, showPhotos?, showMemo?, showVisitDate? } — 본인 아카이브에 있는 canonical 공간만.
 * 아카이브 공간은 기본 공개 — 숨기면 ProfileSpace.hidden=true로 남긴다(행을 지우면 다시 기본 공개가 되므로).
 * 공간을 새로 만들거나 복제하지 않는다(ProfileSpace는 같은 EditorialSpace.id를 가리킬 뿐).
 * 사진 · 나의 한 줄 · 방문 시기(월)는 각각 따로 켤 때만 공개된다(기본 전부 비공개). 방문 메모·정확한 날짜는 공개 대상이 아니다.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => null)) as { spaceId?: unknown; public?: unknown; showPhotos?: unknown; showMemo?: unknown; showVisitDate?: unknown } | null;
  const optBool = (v: unknown) => v === undefined || typeof v === "boolean";
  if (!body || typeof body.spaceId !== "string" || typeof body.public !== "boolean" || !optBool(body.showPhotos) || !optBool(body.showMemo) || !optBool(body.showVisitDate)) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const spaceId = body.spaceId;

  if (!body.public) {
    const exists = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "공간을 찾을 수 없어요." }, { status: 404 });
    const hide = { hidden: true, showPhotos: false, showMemo: false, showVisitDate: false };
    await prisma.profileSpace.upsert({ where: { userId_spaceId: { userId, spaceId } }, create: { userId, spaceId, ...hide }, update: hide });
    return NextResponse.json({ ok: true, public: false });
  }

  const space = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { slug: true, status: true, isDemo: true } });
  if (!space || space.status !== "PUBLISHED" || space.isDemo) return NextResponse.json({ error: "공개할 수 없는 공간이에요." }, { status: 400 });
  const library = await getLibrary(userId, { includeDemo: false });
  if (!library.some((i) => i.key === `s-${space.slug}` && !i.personal)) {
    return NextResponse.json({ error: "내 아카이브에 있는 공간만 공개할 수 있어요." }, { status: 400 });
  }

  // 넘어온 항목만 바꾼다. 새로 공개할 때 넘어오지 않은 항목은 기본값(꺼짐).
  const flags = {
    ...(body.showPhotos !== undefined ? { showPhotos: body.showPhotos as boolean } : {}),
    ...(body.showMemo !== undefined ? { showMemo: body.showMemo as boolean } : {}),
    ...(body.showVisitDate !== undefined ? { showVisitDate: body.showVisitDate as boolean } : {}),
  };
  await prisma.profileSpace.upsert({
    where: { userId_spaceId: { userId, spaceId } },
    create: { userId, spaceId, hidden: false, ...flags },
    update: { hidden: false, ...flags },
  });
  return NextResponse.json({ ok: true, public: true });
}
