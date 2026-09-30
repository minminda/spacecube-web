import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseHomeInput } from "@/lib/editorial/input";
import { badRequest, missingSpaceIds, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/**
 * 홈 노출 설정 저장(단일 행 id="home"). 홈 레이아웃은 코드에 두고 "무엇을 노출할지"만 저장한다.
 * 초안 콘텐츠도 지정할 수 있지만 공개 홈에는 발행된 것만 나온다(queries.getHomeData).
 */
export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = parseHomeInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const { heroSpaceId, featuredCurationId, featuredSpaceIds, feed } = parsed.data;

  const spaceIds = [...(heroSpaceId ? [heroSpaceId] : []), ...featuredSpaceIds, ...feed.flatMap((f) => (f.kind === "space" ? [f.id] : []))];
  const missing = await missingSpaceIds(spaceIds);
  if (missing) return badRequest(missing);

  const curationIds = [...new Set([...(featuredCurationId ? [featuredCurationId] : []), ...feed.flatMap((f) => (f.kind === "curation" ? [f.id] : []))])];
  const personIds = [...new Set(feed.flatMap((f) => (f.kind === "person" ? [f.id] : [])))];
  const [curationCount, personCount] = await Promise.all([
    prisma.editorialCuration.count({ where: { id: { in: curationIds } } }),
    prisma.editorialPerson.count({ where: { id: { in: personIds } } }),
  ]);
  if (curationCount !== curationIds.length || personCount !== personIds.length) {
    return badRequest("선택한 콘텐츠 중 존재하지 않는 항목이 있어요. 페이지를 새로고침해주세요.");
  }

  const data = { heroSpaceId, featuredCurationId, featuredSpaceIds, feed: feed as unknown as Prisma.InputJsonValue };
  await prisma.editorialHomeSettings.upsert({ where: { id: "home" }, update: data, create: { id: "home", ...data } });
  return NextResponse.json({ ok: true });
}
