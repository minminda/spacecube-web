import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, missingSpaceIds, readJson, requireAdminApi } from "@/lib/editorial/adminApi";
import { parseEditorialShelf } from "@/lib/home/shelfConfig";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 편집 선반 수정 — 제목 · 설명 · 노출 · 포함 공간(순서 · 선정 이유)을 한 트랜잭션으로 교체한다. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const shelf = await prisma.homeShelf.findUnique({ where: { id }, select: { kind: true } });
  if (!shelf || shelf.kind !== "EDITORIAL") return NextResponse.json({ error: "선반을 찾을 수 없어요." }, { status: 404 });

  const parsed = parseEditorialShelf(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const { spaces, ...data } = parsed.data;
  const missing = await missingSpaceIds(spaces.map((s) => s.spaceId));
  if (missing) return badRequest(missing);

  await prisma.$transaction([
    prisma.homeShelf.update({ where: { id }, data }),
    prisma.homeShelfSpace.deleteMany({ where: { shelfId: id } }),
    prisma.homeShelfSpace.createMany({ data: spaces.map((s, i) => ({ shelfId: id, spaceId: s.spaceId, note: s.note, order: i })) }),
  ]);
  return NextResponse.json({ ok: true });
}

/** 편집 선반 삭제 — 포함 공간 연결만 함께 지워지고 공간 자체는 남는다. SYSTEM / PERSONALIZED 설정은 삭제할 수 없다. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const shelf = await prisma.homeShelf.findUnique({ where: { id }, select: { kind: true } });
  if (!shelf || shelf.kind !== "EDITORIAL") return NextResponse.json({ error: "선반을 찾을 수 없어요." }, { status: 404 });
  await prisma.homeShelf.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
