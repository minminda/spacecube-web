import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { archiveCaller, archiveErrorResponse, photoGuard, readBody } from "@/lib/archive/apiAuth";
import { createOrMergeEntry, getArchiveTagOptions } from "@/lib/archive/entries";
import { parseCreateInput } from "@/lib/archive/input";

export const dynamic = "force-dynamic";

/**
 * 공간 추가 — 공간큐브에 등록된 공간(spaceId)을 골라 내 기록을 붙인다. 공간 이름·링크만으로 새 공간 기록을 만들지 않는다
 * (예전 V1의 사진/링크/이름 개인 기록은 그대로 읽고 고칠 수 있지만 새로 만들지는 않음). 같은 공간 기록이 있으면 덧붙인다.
 */
export async function POST(req: Request) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  const spaceId = typeof body?.spaceId === "string" ? body.spaceId : null;
  if (!spaceId) return NextResponse.json({ error: "공간큐브에 있는 공간을 검색해서 골라주세요." }, { status: 400 });
  const [tags, space] = await Promise.all([
    getArchiveTagOptions(),
    spaceId ? prisma.editorialSpace.findUnique({ where: { id: spaceId }, select: { name: true } }) : Promise.resolve(null),
  ]);
  const parsed = parseCreateInput(body, { isAllowedPhoto: photoGuard(caller.userId), allowedTags: new Set(tags), spaceName: space?.name ?? null });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const r = await createOrMergeEntry(caller.userId, parsed.data, { includeDemo: caller.includeDemo });
    return NextResponse.json(r, { status: r.merged ? 200 : 201 });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}
