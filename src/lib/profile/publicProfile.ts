/* ── 공개 취향 프로필(순수 함수) ─────────────────────────────────────────────
   내 아카이브 = 나만의 공간 기록(저장 · 방문 · 사진 · 메모 · 날짜).
   공개 프로필 = 내가 고른 공간이 쌓인 개인 공간 매거진(/@handle). 취향은 숫자·태그로 설명하지 않는다 —
   고른 공간과 사진을 보면 느껴지게 한다. 태그·취향 가중치는 추천 엔진 안에서만 쓴다(화면에 내보내지 않음).
   - 기본은 전부 비공개. 프로필을 켜도 공간은 하나씩 직접 공개해야 보인다(ProfileSpace).
   - 공개할 수 있는 건 canonical 공간(EditorialSpace, 발행·실공간)뿐 — 개인 기록·가상 공간은 공개 불가.
   - 사진 · 나의 한 줄 · 방문 시기는 공간마다 각각 켤 때만(기본 꺼짐).
   - 사람 사이 관계는 "취향 따라가기"(SavedTaste 재사용). 수는 작은 보조 문구로만. ── */

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
  if (o.profilePublic !== undefined) {
    if (typeof o.profilePublic !== "boolean") return { ok: false, error: "설정 값이 올바르지 않아요." };
    out.profilePublic = o.profilePublic;
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

export interface PublicFlags {
  showPhotos: boolean;
  showMemo: boolean;
  showVisitDate: boolean;
}

export interface PublicSpaceRow extends PublicFlags {
  spaceId: string;
  slug: string;
  visited: boolean;
  /** 정렬용(화면에 날짜로 내보내지 않는다 — 방문 시기는 showVisitDate일 때만 따로) */
  lastAt: Date;
}

/**
 * 공개 프로필에 실제로 나올 공간 — 공개로 고른 공간(ProfileSpace) 중 지금도 내 아카이브에 있는 것만.
 * 아카이브에서 지웠거나, 공간이 비공개·가상으로 바뀌면 자동으로 빠진다. 최근에 기록한 순.
 */
export function publicSpaces(
  library: LibraryLike[],
  picks: (PublicFlags & { spaceId: string; space: { slug: string; status: string; isDemo: boolean } })[],
): PublicSpaceRow[] {
  const byKey = new Map(library.map((i) => [i.key, i]));
  const out: PublicSpaceRow[] = [];
  for (const p of picks) {
    if (p.space.status !== "PUBLISHED" || p.space.isDemo) continue;
    const it = byKey.get(`s-${p.space.slug}`);
    if (!it || it.personal || it.demo || !(it.visited || it.saved)) continue;
    out.push({
      spaceId: p.spaceId, slug: p.space.slug, visited: it.visited, lastAt: it.lastAt,
      showPhotos: p.showPhotos, showMemo: p.showMemo, showVisitDate: p.showVisitDate,
    });
  }
  return out.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/**
 * 카드 사진 — 이 사람이 공개를 허용한 자기 사진이 있으면 그 사진(같은 공간이어도 사람마다 다른 시선),
 * 없으면 공간큐브의 공간 대표 사진. 사진 공개를 끈 공간의 개인 사진은 절대 쓰지 않는다.
 */
export function cardPhoto(row: Pick<PublicFlags, "showPhotos">, myPhotos: string[], spaceCover: string | null | undefined): { url: string | null; mine: boolean } {
  if (row.showPhotos && myPhotos[0]) return { url: myPhotos[0], mine: true };
  return { url: spaceCover ?? null, mine: false };
}

/** 방문 시기 표시 — 날짜까지 말고 "2026.09"(KST 월) 정도만. */
export function visitMonth(d: Date | null): string | null {
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return y && m ? `${y}.${m}` : null;
}

/** 상대가 공개한 공간 중 내 아카이브에도 있는 공간 — 비공개 공간은 비교에도 쓰지 않는다. */
export function commonSpaceIds(viewerSpaceSlugs: Set<string>, targetPublic: { spaceId: string; slug: string }[]): string[] {
  return targetPublic.filter((s) => viewerSpaceSlugs.has(s.slug)).map((s) => s.spaceId);
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

/** 사람 찾기 검색어 — 앞뒤 공백·@ 제거, 2자 이상 30자 이하. 짧으면 검색하지 않는다(전체 목록·인기순 노출 없음). */
export function peopleQuery(raw: string | undefined): string | null {
  const q = (raw ?? "").trim().replace(/^@/, "").slice(0, 30);
  return q.length >= 2 ? q : null;
}
