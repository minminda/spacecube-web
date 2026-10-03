/* ── Editorial 콘텐츠 참조 검사 ───────────────────────────────────────────
   영구 삭제는 "보관 상태 + 어디에서도 참조되지 않음"일 때만 허용한다. 연결 테이블(FK)뿐 아니라
   FK가 없는 참조 — 본문 SPACE_CARD 블록(JSON) — 까지 본다. HOME은 발행 콘텐츠로 자동 구성되므로
   (EditorialHomeSettings는 더 이상 쓰지 않음) 홈 설정은 참조로 보지 않는다. ── */

import { prisma } from "@/lib/prisma";
import { collectBlockSpaceIds, readStoredBlocks } from "./input";
import { formatCurationNumber, formatPeopleNumber, formatThoughtNumber } from "./types";

export interface EditorialReference {
  label: string;
  href: string;
}

export async function findSpaceReferences(spaceId: string): Promise<EditorialReference[]> {
  const [curations, people, thoughts, saveCount] = await Promise.all([
    prisma.editorialCuration.findMany({ select: { id: true, number: true, title: true, blocks: true, spaces: { select: { spaceId: true } } } }),
    prisma.editorialPerson.findMany({ select: { id: true, number: true, title: true, blocks: true, spaces: { select: { spaceId: true } } } }),
    prisma.editorialThought.findMany({ select: { id: true, number: true, title: true, blocks: true, spaces: { select: { spaceId: true } } } }),
    // 사용자가 저장한 공간은 영구 삭제하지 않는다(아카이브의 저장 기록이 사라지지 않도록 — 보관만 가능).
    prisma.savedEditorialSpace.count({ where: { spaceId } }),
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
  for (const t of thoughts) {
    const inLinks = t.spaces.some((l) => l.spaceId === spaceId);
    const inBlocks = collectBlockSpaceIds(readStoredBlocks(t.blocks)).includes(spaceId);
    if (inLinks || inBlocks) refs.push({ label: `${formatThoughtNumber(t.number)} ${t.title}${inLinks ? " (연결 공간)" : " (본문 공간 카드)"}`, href: `/admin/content/thoughts/${t.id}` });
  }
  if (saveCount > 0) refs.push({ label: `사용자 ${saveCount}명이 저장한 공간 (보관 상태로 두면 공개 화면에서는 보이지 않아요)`, href: "/admin/content/spaces" });
  return refs;
}
