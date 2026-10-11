/* ── 태그 정본(관리자 Tag) 규칙 ──────────────────────────────────────────
   공간의 탐색 · 검색 · 추천 태그는 관리자 Tag 테이블이 정본이다.
   · 운영 공간(Cube): SpaceTag(tagId)로 연결 — 이미 정본을 쓴다.
   · 공간 등록(EditorialSpace): tags 문자열 배열에 Tag.name을 그대로 저장한다(스키마 변경 없음).
     그래서 태그 이름을 바꾸면 이 배열의 문자열도 같이 바꿔야 한다(renameEditorialTag). ── */

import { prisma } from "@/lib/prisma";

/** 이름 비교용 정규화 — 공백/대소문자 차이를 같은 태그로 본다. */
export function normTagName(s: string): string {
  return s.trim().replace(/\s+/g, "").toLowerCase();
}

export function cleanTagName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/\s+/g, " ");
  return v || null;
}

/** 같은 이름(정규화 기준)의 다른 태그. */
export function findTagNameConflict(name: string, all: { id: string; name: string }[], selfId?: string) {
  const n = normTagName(name);
  return all.find((t) => t.id !== selfId && normTagName(t.name) === n) ?? null;
}

export interface TagSpaceRef { id: string; name: string; kind: "operating" | "editorial"; slug: string }

/** 태그 이름 → 그 태그를 쓰는 공간들(공간 등록 쪽). 시연 공간은 제외. */
export async function getEditorialTagUsers(): Promise<Map<string, TagSpaceRef[]>> {
  const rows = await prisma.editorialSpace.findMany({ where: { isDemo: false, status: { not: "ARCHIVED" } }, select: { id: true, name: true, slug: true, tags: true } });
  const map = new Map<string, TagSpaceRef[]>();
  for (const r of rows) {
    for (const t of r.tags) {
      const key = normTagName(t);
      const list = map.get(key) ?? [];
      list.push({ id: r.id, name: r.name, slug: r.slug, kind: "editorial" });
      map.set(key, list);
    }
  }
  return map;
}

/** 이 태그 이름을 쓰는 공간 등록 수 — 시연(fixture) · 보관 공간까지 모두 센다(삭제 가능 여부 판단용: 문자열이 조용히 고아가 되지 않게). */
export async function countAllEditorialTagUsers(name: string): Promise<number> {
  const target = normTagName(name);
  const rows = await prisma.editorialSpace.findMany({ select: { tags: true } });
  return rows.filter((r) => r.tags.some((t) => normTagName(t) === target)).length;
}

/** 공개(비시연 · 비보관) 공간에 남아 있지만 태그 관리에는 없는 태그 문자열 — 과거 자유 입력 값. */
export async function findUnregisteredEditorialTags(): Promise<{ name: string; spaces: TagSpaceRef[] }[]> {
  const [rows, tags] = await Promise.all([
    prisma.editorialSpace.findMany({ where: { isDemo: false, status: { not: "ARCHIVED" } }, select: { id: true, name: true, slug: true, tags: true } }),
    prisma.tag.findMany({ select: { name: true } }),
  ]);
  const known = new Set(tags.map((t) => normTagName(t.name)));
  const out = new Map<string, { name: string; spaces: TagSpaceRef[] }>();
  for (const r of rows) {
    for (const t of r.tags) {
      if (known.has(normTagName(t))) continue;
      const entry = out.get(normTagName(t)) ?? { name: t, spaces: [] };
      entry.spaces.push({ id: r.id, name: r.name, slug: r.slug, kind: "editorial" });
      out.set(normTagName(t), entry);
    }
  }
  return [...out.values()];
}

/** 태그 이름을 바꿀 때 공간 등록의 tags 문자열도 함께 바꾼다(시연 · 보관 공간 포함 — 문자열이 깨지지 않게). 바뀐 공간 수를 돌려준다. */
export async function renameEditorialTag(from: string, to: string): Promise<number> {
  const target = normTagName(from);
  const rows = await prisma.editorialSpace.findMany({ select: { id: true, tags: true } });
  const changed = rows.filter((r) => r.tags.some((t) => normTagName(t) === target));
  await prisma.$transaction(
    changed.map((r) => prisma.editorialSpace.update({
      where: { id: r.id },
      // 이미 새 이름이 들어 있으면 중복 없이 하나만 남긴다
      data: { tags: [...new Set(r.tags.map((t) => (normTagName(t) === target ? to : t)))] },
    })),
  );
  return changed.length;
}

/* ── 공간 등록의 태그 입력 검증 ────────────────────────────────────────────
   새 태그는 반드시 관리자 > 태그 관리에서 만든다. 공간 저장 때 활성 Tag에 없는 문자열은 막는다.
   단, 그 공간에 이미 들어 있던 태그(과거에 자유 입력된 값)는 다른 필드만 고칠 때 저장이 막히지 않게 그대로 둘 수 있다. ── */

export interface TagCheck {
  /** 등록된 표기로 맞춘 태그(대소문자 · 공백 차이는 정본 이름으로) */
  tags: string[];
  /** 정본에도 없고 이 공간에 원래 있던 것도 아닌 태그 — 비어 있어야 저장 가능 */
  unknown: string[];
}

export function checkSpaceTags(input: string[], activeNames: string[], existing: string[] = []): TagCheck {
  const canon = new Map(activeNames.map((n) => [normTagName(n), n]));
  const had = new Set(existing.map(normTagName));
  const tags: string[] = [];
  const unknown: string[] = [];
  for (const t of input) {
    const key = normTagName(t);
    const name = canon.get(key);
    if (name) tags.push(name);
    else if (had.has(key)) tags.push(t);
    else unknown.push(t);
  }
  return { tags: [...new Set(tags)], unknown };
}

export async function getActiveTagNames(): Promise<string[]> {
  return (await prisma.tag.findMany({ where: { isActive: true }, select: { name: true } })).map((t) => t.name);
}

export function unknownTagMessage(unknown: string[]): string {
  return `태그 관리에 없는 태그예요: ${unknown.join(", ")}. 태그 관리에서 먼저 추가해주세요.`;
}
