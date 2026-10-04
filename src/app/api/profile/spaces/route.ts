import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/archive/library";

export const dynamic = "force-dynamic";

/**
 * 공간 하나를 공개 프로필에 보이기/숨기기 { spaceId, public, showPhotos? } — 본인 아카이브에 있는 canonical 공간만.
 * 공간을 새로 만들거나 복제하지 않는다(ProfileSpace는 같은 EditorialSpace.id를 가리킬 뿐).
 * 사진은 showPhotos를 따로 켤 때만 공개된다(기본 비공개). 메모·날짜는 어떤 경우에도 공개하지 않는다.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => null)) as { spaceId?: unknown; public?: unknown; showPhotos?: unknown } | null;
  if (!body || typeof body.spaceId !== "string" || typeof body.public !== "boolean" || (body.showPhotos !== undefined && typeof body.showPhotos !== "boolean")) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const spaceId = body.spaceId;

  if (!body.public) {
    await prisma.profileSpace.deleteMany({ where: { userId, spaceId } });
    return NextResponse.json({ ok: true, public: false });
  }

  const space = await prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { slug: true, status: true, isDemo: true } });
  if (!space || space.status !== "PUBLISHED" || space.isDemo) return NextResponse.json({ error: "공개할 수 없는 공간이에요." }, { status: 400 });
  const library = await getLibrary(userId, { includeDemo: false });
  if (!library.some((i) => i.key === `s-${space.slug}` && !i.personal)) {
    return NextResponse.json({ error: "내 아카이브에 있는 공간만 공개할 수 있어요." }, { status: 400 });
  }

  const showPhotos = body.showPhotos === true;
  await prisma.profileSpace.upsert({
    where: { userId_spaceId: { userId, spaceId } },
    create: { userId, spaceId, showPhotos },
    update: body.showPhotos === undefined ? {} : { showPhotos },
  });
  return NextResponse.json({ ok: true, public: true });
}
