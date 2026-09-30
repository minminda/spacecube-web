/* ── Editorial 콘텐츠 참조 검사 ───────────────────────────────────────────
   영구 삭제는 "보관 상태 + 어디에서도 참조되지 않음"일 때만 허용한다. 연결 테이블(FK)뿐 아니라
   FK가 없는 참조 — 본문 SPACE_CARD 블록(JSON), 홈 설정의 featuredSpaceIds/feed — 까지 전부 본다. ── */

import { prisma } from "@/lib/prisma";
import { collectBlockSpaceIds, readStoredBlocks, readStoredFeed } from "./input";
import { formatCurationNumber, formatPeopleNumber } from "./types";

export interface EditorialReference {
  label: string;
  href: string;
}

async function homeRefs(match: (s: { heroSpaceId: string | null; featuredCurationId: string | null; featuredSpaceIds: string[]; feed: unknown }) => string[]) {
  const settings = await prisma.editorialHomeSettings.findUnique({ where: { id: "home" } });
  if (!settings) return [];
  return match(settings).map((label) => ({ label: `홈페이지 · ${label}`, href: "/admin/content/home" }));
}

export async function findSpaceReferences(spaceId: string): Promise<EditorialReference[]> {
  const [curations, people] = await Promise.all([
    prisma.editorialCuration.findMany({ select: { id: true, number: true, title: true, blocks: true, spaces: { select: { spaceId: true } } } }),
    prisma.editorialPerson.findMany({ select: { id: true, number: true, title: true, blocks: true, spaces: { select: { spaceId: true } } } }),
  ]);
  const refs: EditorialReference[] = [];
  for (const c of curations) {
    const inLinks = c.spaces.some((l) => l.spaceId === spaceId);
    const inBlocks = collectBlockSpaceIds(readStoredBlocks(c.blocks)).includes(spaceId);
    if (inLinks || inBlocks) refs.push({ label: `${formatCurationNumber(c.number)} ${c.title}${inLinks ? " (연결 공간)" : " (본문 공간 카드)"}`, href: `/admin/content/curations/${c.id}` });
  }
  for (const p of people) {
    const inLinks = p.spaces.some((l) => l.spaceId === spaceId);
    const inBlocks = collectBlockSpaceIds(readStoredBlocks(p.blocks)).includes(spaceId);
    if (inLinks || inBlocks) refs.push({ label: `${formatPeopleNumber(p.number)} ${p.title}${inLinks ? " (연결 공간)" : " (본문 공간 카드)"}`, href: `/admin/content/people/${p.id}` });
  }
  refs.push(
    ...(await homeRefs((s) => [
      ...(s.heroSpaceId === spaceId ? ["히어로 사진"] : []),
      ...(s.featuredSpaceIds.includes(spaceId) ? ["공간 둘러보기"] : []),
      ...(readStoredFeed(s.feed).some((f) => f.kind === "space" && f.id === spaceId) ? ["최근 이야기"] : []),
    ])),
  );
  return refs;
}

export async function findCurationReferences(curationId: string): Promise<EditorialReference[]> {
  return homeRefs((s) => [
    ...(s.featuredCurationId === curationId ? ["대표 큐레이션"] : []),
    ...(readStoredFeed(s.feed).some((f) => f.kind === "curation" && f.id === curationId) ? ["최근 이야기"] : []),
  ]);
}

export async function findPersonReferences(personId: string): Promise<EditorialReference[]> {
  return homeRefs((s) => (readStoredFeed(s.feed).some((f) => f.kind === "person" && f.id === personId) ? ["최근 이야기"] : []));
}
