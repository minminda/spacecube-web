import { invalidateSearchCorpus } from "@/lib/search/searchData";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSpaceInput } from "@/lib/editorial/input";
import { checkSpaceTags, getActiveTagNames, unknownTagMessage } from "@/lib/tagAdmin";
import { badRequest, prismaErrorResponse, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 공간 콘텐츠 생성 — 항상 초안(DRAFT)으로 만든다. 발행은 status 라우트에서. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = parseSpaceInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);

  // 새 태그는 태그 관리에서만 — 등록된 활성 태그만 허용한다
  const check = checkSpaceTags(parsed.data.tags, await getActiveTagNames());
  if (check.unknown.length > 0) return badRequest(unknownTagMessage(check.unknown));

  try {
    const space = await prisma.editorialSpace.create({ data: { ...parsed.data, tags: check.tags, story: parsed.data.story as unknown as Prisma.InputJsonValue, status: "DRAFT" }, select: { id: true } });
    invalidateSearchCorpus();
    return NextResponse.json({ id: space.id }, { status: 201 });
  } catch (e) {
    const res = prismaErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
