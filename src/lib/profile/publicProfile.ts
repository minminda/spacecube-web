/* ── 공개 취향 프로필(순수 함수) ─────────────────────────────────────────────
   내 아카이브 = 나만의 공간 기록(저장 · 방문 · 사진 · 메모 · 날짜).
   공개 프로필 = 내가 고른 공간과 취향만 다른 사람에게 보여주는 곳(/@handle).
   - 기본은 전부 비공개. 프로필을 켜도 공간은 하나씩 직접 공개해야 보인다(ProfileSpace).
   - 공개할 수 있는 건 canonical 공간(EditorialSpace, 발행·실공간)뿐 — 개인 기록·가상 공간은 공개 불가.
   - 메모와 방문 날짜는 공개 화면에 절대 내보내지 않는다. 사진은 공간별 showPhotos일 때만.
   - 사람 사이 관계는 "취향 따라가기"(SavedTaste 재사용). 숫자 경쟁 없이 내가 따라가는 수만 작게.
   - 취향 비교는 퍼센트 없이 큐레이터 겹침과 같은 단계(levelOf)로만. ── */

import { levelOf, AFFINITY_LABEL, type AffinityLevel } from "@/lib/curators/affinity";
import { normalizeArea } from "@/lib/editorial/area";

/* ── 핸들(공유 주소 /@handle) ── */

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])$/;
const RESERVED = new Set(["admin", "api", "archive", "login", "about", "story", "curation", "find", "latest", "spacecube", "gonggancube", "official", "help", "settings"]);

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** 오류 메시지 또는 null. 3~24자, 영문 소문자·숫자·마침표·밑줄·하이픈, 처음과 끝은 영문/숫자. */
export function handleError(raw: string): string | null {
  const h = normalizeHandle(raw);
  if (!h) return "프로필 주소를 입력해주세요.";
  if (!HANDLE_RE.test(h)) return "프로필 주소는 3~24자의 영문 소문자·숫자·._-만 쓸 수 있어요(처음과 끝은 영문·숫자).";
  if (RESERVED.has(h)) return "이 주소는 쓸 수 없어요. 다른 주소를 골라주세요.";
  return null;
}

export function profilePath(handle: string): string {
  return `/@${handle}`;
}

/* ── 설정 입력 ── */

export interface ProfileSettingsInput {
  profilePublic?: boolean;
  handle?: string;
  bio?: string | null;
  showTaste?: boolean;
  showAreas?: boolean;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * 설정 저장 입력 검증. 프로필을 켜려면 주소가 있어야 한다(지금 보내거나 이미 저장돼 있거나).
 * 넘어온 필드만 바꾼다(부분 수정).
 */
export function parseProfileSettings(raw: unknown, currentHandle: string | null): ParseResult<ProfileSettingsInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "요청 형식이 올바르지 않아요." };
  const o = raw as Record<string, unknown>;
  const out: ProfileSettingsInput = {};
  for (const k of ["profilePublic", "showTaste", "showAreas"] as const) {
    if (o[k] === undefined) continue;
    if (typeof o[k] !== "boolean") return { ok: false, error: "설정 값이 올바르지 않아요." };
    out[k] = o[k] as boolean;
  }
  if (o.handle !== undefined) {
    if (typeof o.handle !== "string") return { ok: false, error: "프로필 주소 형식이 올바르지 않아요." };
    const err = handleError(o.handle);
    if (err) return { ok: false, error: err };
    out.handle = normalizeHandle(o.handle);
  }
  if (o.bio !== undefined) {
    if (o.bio !== null && typeof o.bio !== "string") return { ok: false, error: "한 줄 소개 형식이 올바르지 않아요." };
    const bio = typeof o.bio === "string" ? o.bio.trim().replace(/\s+/g, " ") : "";
    if (bio.length > 120) return { ok: false, error: "한 줄 소개는 120자 이하로 입력해주세요." };
    out.bio = bio || null;
  }
  if (out.profilePublic && !(out.handle ?? currentHandle)) return { ok: false, error: "공개하려면 먼저 프로필 주소를 정해주세요." };
  return { ok: true, data: out };
}

/* ── 공개 공간 ── */

/** 아카이브 한 칸(필요한 부분만) — src/lib/archive/library.ts의 LibraryItem과 호환 */
export interface LibraryLike {
  key: string;
  visited: boolean;
  saved: boolean;
  lastAt: Date;
  personal: boolean;
  demo: boolean;
}

export interface PublicSpaceRow {
  spaceId: string;
  slug: string;
  area: string | null;
  visited: boolean;
  showPhotos: boolean;
  /** 정렬용(화면에 날짜로 내보내지 않는다) */
  lastAt: Date;
}

/**
 * 공개 프로필에 실제로 나올 공간 — 공개로 고른 공간(ProfileSpace) 중 지금도 내 아카이브에 있는 것만.
 * 아카이브에서 지웠거나, 공간이 비공개·가상으로 바뀌면 자동으로 빠진다. 최근에 기록한 순.
 */
export function publicSpaces(
  library: LibraryLike[],
  picks: { spaceId: string; showPhotos: boolean; space: { slug: string; area: string; status: string; isDemo: boolean } }[],
): PublicSpaceRow[] {
  const byKey = new Map(library.map((i) => [i.key, i]));
  const out: PublicSpaceRow[] = [];
  for (const p of picks) {
    if (p.space.status !== "PUBLISHED" || p.space.isDemo) continue;
    const it = byKey.get(`s-${p.space.slug}`);
    if (!it || it.personal || it.demo || !(it.visited || it.saved)) continue;
    out.push({ spaceId: p.spaceId, slug: p.space.slug, area: p.space.area, visited: it.visited, showPhotos: p.showPhotos, lastAt: it.lastAt });
  }
  return out.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/** 자주 찾는 지역 — 공개한 공간만으로 센다(비공개 기록으로 사는 곳·다니는 곳이 드러나지 않게). */
export function frequentAreas(rows: { area: string | null }[], n = 3): string[] {
  const count = new Map<string, number>();
  for (const r of rows) {
    const a = normalizeArea(r.area);
    if (a) count.set(a, (count.get(a) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).slice(0, n).map(([a]) => a);
}

/* ── 내 취향과 비교(퍼센트 없음) ── */

export interface TasteComparison {
  level: AffinityLevel;
  label: string;
  /** 상대의 공개 대표 취향 중 나에게도 있는 단어 */
  sharedWords: string[];
  /** 상대가 공개한 공간 중 내 아카이브에도 있는 공간 id */
  commonSpaceIds: string[];
}

/**
 * viewerWeights: 내 취향 프로필(attrKey → 가중치). targetWords: 상대가 공개한 대표 취향 단어(숨겼으면 []).
 * commonSpaceIds는 상대가 공개한 공간만 대상으로 한다 — 비공개 공간은 비교에도 쓰지 않는다.
 */
export function compareTaste(
  viewerWeights: Map<string, number>,
  targetWords: string[],
  viewerSpaceSlugs: Set<string>,
  targetPublic: { spaceId: string; slug: string }[],
  key: (w: string) => string,
): TasteComparison {
  const sharedWords = targetWords.filter((w) => (viewerWeights.get(key(w)) ?? 0) > 0);
  const commonSpaceIds = targetPublic.filter((s) => viewerSpaceSlugs.has(s.slug)).map((s) => s.spaceId);
  const level = levelOf(commonSpaceIds.length, sharedWords.length);
  return { level, label: AFFINITY_LABEL[level], sharedWords, commonSpaceIds };
}

/* ── 취향 따라가기 ── */

export type FollowCheck = { ok: true } | { ok: false; status: 400 | 404; error: string };

/** 자기 자신 · 없는 사용자 · 비공개 프로필 · 시연 계정은 따라갈 수 없다. 중복은 DB unique + upsert로 막는다. */
export function canFollow(viewerId: string, target: { id: string; profilePublic: boolean; isDemo: boolean } | null): FollowCheck {
  if (!target || target.isDemo) return { ok: false, status: 404, error: "프로필을 찾을 수 없어요." };
  if (target.id === viewerId) return { ok: false, status: 400, error: "내 취향은 따라갈 수 없어요." };
  if (!target.profilePublic) return { ok: false, status: 404, error: "공개되지 않은 프로필이에요." };
  return { ok: true };
}

/* ── 공개 대표 취향 ── */

/**
 * 대표 취향 — 순서는 기존 취향 계산(저장·방문·아카이브 전체 신호의 가중치)을 그대로 따르되,
 * 공개한 공간의 유형·태그에서도 확인되는 단어만 보여준다. 비공개로 둔 공간에서만 나온 취향(예: 숨긴 공간의 "LP카페")이
 * 공개 프로필로 새어 나가지 않게 하기 위해서다. 공개한 공간이 없으면 빈 목록.
 */
export function publicTasteWords(
  ranked: { key: string; label: string }[],
  publicAttrs: string[],
  key: (w: string) => string,
  n = 4,
): string[] {
  const allowed = new Set(publicAttrs.map(key).filter(Boolean));
  return ranked.filter((r) => allowed.has(r.key)).slice(0, n).map((r) => r.label);
}
