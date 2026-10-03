import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { archiveCaller, archiveErrorResponse, photoGuard, readBody } from "@/lib/archive/apiAuth";
import { createOrMergeEntry, getArchiveTagOptions } from "@/lib/archive/entries";
import { parseCreateInput } from "@/lib/archive/input";

export const dynamic = "force-dynamic";

/** 공간 추가(사진/링크/이름) — 같은 공개 공간의 기록이 이미 있으면 거기에 덧붙인다. */
export async function POST(req: Request) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  const spaceId = typeof body?.spaceId === "string" ? body.spaceId : null;
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
