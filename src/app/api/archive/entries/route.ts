import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { archiveCaller, archiveErrorResponse, photoGuard, readBody } from "@/lib/archive/apiAuth";
import { createOrMergeEntry, getArchiveTagOptions } from "@/lib/archive/entries";
import { parseCreateInput } from "@/lib/archive/input";
import { parseHttpUrl } from "@/lib/archive/source";

export const dynamic = "force-dynamic";

/**
 * 공간 추가 — 기본은 공간큐브에 등록된 공간(spaceId)을 골라 내 기록을 붙인다(같은 공간 기록이 있으면 덧붙임).
 * 검색 결과가 없을 때만 "직접 등록"(personal: true)으로 이름(필수) · 사진 · 링크(선택)의 개인 기록을 만든다 —
 * 이 기록은 공용 공간이 아니다(다른 사용자 검색에 안 나오고, 공간 사진·태그가 없어 추천 취향에도 쓰이지 않는다).
 * 나중에 정식 공간이 생기면 ArchiveEntry.spaceId로 연결할 수 있다(placeKey로 같은 장소 묶기).
 */
export async function POST(req: Request) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  const spaceId = typeof body?.spaceId === "string" ? body.spaceId : null;
  const personal = body?.personal === true;
  if (!spaceId && !personal) return NextResponse.json({ error: "공간큐브에 있는 공간을 검색해서 골라주세요." }, { status: 400 });
  if (personal) {
    if (spaceId) return NextResponse.json({ error: "직접 등록은 공간큐브 공간과 함께 보낼 수 없어요." }, { status: 400 });
    const raw = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const url = raw ? parseHttpUrl(raw) : null;
    if (raw && !url) return NextResponse.json({ error: "링크는 http(s)://로 시작하는 주소여야 해요." }, { status: 400 });
    // 공유 문구에 섞여 붙여넣은 경우에도 주소만 저장(내용은 가져오지 않음)
    body!.sourceUrl = url?.href ?? null;
    body!.fromPhoto = Array.isArray(body!.photos) && body!.photos.length > 0;
  } else if (body) {
    // 공간큐브 공간에 붙이는 기록에는 외부 링크·사진 출처를 받지 않는다(공간 정보는 공간큐브 것)
    body.sourceUrl = null;
    body.fromPhoto = false;
  }
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
