import { invalidateSearchCorpus } from "@/lib/search/searchData";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSpaceInput } from "@/lib/editorial/input";
import { findSpaceReferences } from "@/lib/editorial/references";
import { checkSpaceTags, getActiveTagNames, unknownTagMessage } from "@/lib/tagAdmin";
import { badRequest, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 공간 콘텐츠 수정 — 상태(status)는 바꾸지 않는다. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const parsed = parseSpaceInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);

  // 새 태그는 태그 관리에서만 — 이미 이 공간에 있던 태그는 그대로 둘 수 있다
  const current = await prisma.editorialSpace.findUnique({ where: { id }, select: { tags: true } });
  if (!current) return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
  const check = checkSpaceTags(parsed.data.tags, await getActiveTagNames(), current.tags);
  if (check.unknown.length > 0) return badRequest(unknownTagMessage(check.unknown));

  try {
    await prisma.editorialSpace.update({ where: { id }, data: { ...parsed.data, tags: check.tags, story: parsed.data.story as unknown as Prisma.InputJsonValue } });
    invalidateSearchCorpus();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}

/**
 * 영구 삭제 — 보관(ARCHIVED) 상태이고 어디에서도 참조되지 않을 때만 허용한다.
 * 참조가 있으면 409와 함께 참조 목록을 돌려준다(연결 테이블 FK도 Restrict라 DB에서 한 번 더 막힌다).
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;

  const space = await prisma.editorialSpace.findUnique({ where: { id }, select: { status: true } });
  if (!space) return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
  if (space.status !== "ARCHIVED") return NextResponse.json({ error: "보관된 콘텐츠만 영구 삭제할 수 있어요. 먼저 보관해주세요." }, { status: 409 });

  const references = await findSpaceReferences(id);
  if (references.length > 0) {
    return NextResponse.json({ error: "다른 콘텐츠에서 사용 중이라 삭제할 수 없어요.", references }, { status: 409 });
  }
  try {
    await prisma.editorialSpace.delete({ where: { id } });
    invalidateSearchCorpus();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
