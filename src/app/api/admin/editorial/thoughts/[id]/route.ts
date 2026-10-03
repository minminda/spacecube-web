import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectBlockSpaceIds, parseThoughtInput } from "@/lib/editorial/input";
import { badRequest, missingSpaceIds, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** THOUGHT 수정 — 기본 정보·본문 블록·연결 공간(순서 포함)을 한 트랜잭션으로 교체한다. 상태는 바꾸지 않는다. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const parsed = parseThoughtInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const { spaces, blocks, ...data } = parsed.data;

  const missing = await missingSpaceIds([...spaces.map((s) => s.spaceId), ...collectBlockSpaceIds(blocks)]);
  if (missing) return badRequest(missing);

  try {
    await prisma.$transaction([
      prisma.editorialThought.update({ where: { id }, data: { ...data, blocks: blocks as unknown as Prisma.InputJsonValue } }),
      prisma.editorialThoughtSpace.deleteMany({ where: { thoughtId: id } }),
      prisma.editorialThoughtSpace.createMany({ data: spaces.map((s, i) => ({ thoughtId: id, spaceId: s.spaceId, note: s.note, order: i })) }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}

/** 영구 삭제 — 보관(ARCHIVED) 상태일 때만(다른 콘텐츠가 참조하지 않는 유형). 연결 공간 행만 함께 지워지고 공간 자체는 남는다. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const row = await prisma.editorialThought.findUnique({ where: { id }, select: { status: true } });
  if (!row) return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
  if (row.status !== "ARCHIVED") return NextResponse.json({ error: "보관된 콘텐츠만 영구 삭제할 수 있어요. 먼저 보관해주세요." }, { status: 409 });

  await prisma.editorialThought.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
