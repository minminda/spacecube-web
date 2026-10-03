/* ── 아카이브 입력 검증(순수 함수) ─────────────────────────────────────────
   최소 필수: 공간 이름(연결된 공간이면 그 이름) + (사진으로 추가하면) 사진 1장. 나머지는 전부 선택이고 나중에 고칠 수 있다.
   사진 주소는 서버가 서명해 준 사용자 폴더의 Cloudinary 주소만 받는다(isAllowedPhoto). ── */

export interface PhotoInput {
  url: string;
  width?: number;
  height?: number;
}

export interface CreateEntryInput {
  spaceId: string | null;
  placeName: string;
  placeArea: string | null;
  status: "SAVED" | "VISITED";
  /** 다녀왔어요로 만들 때 방문 1건을 함께 남길지(이미 Cube로 방문한 공간을 기록만 할 때는 false) */
  addVisit: boolean;
  sourceUrl: string | null;
  fromPhoto: boolean;
  visitedOn: Date | null;
  memo: string | null;
  tags: string[];
  photos: PhotoInput[];
}

export interface PatchEntryInput {
  placeName?: string;
  placeArea?: string | null;
  memo?: string | null;
  tags?: string[];
  wantAgain?: boolean | null;
  status?: "SAVED" | "VISITED";
}

export interface VisitInput {
  visitedOn: Date | null;
  memo: string | null;
  photos: PhotoInput[];
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const MAX_PHOTOS_PER_REQUEST = 10;
export const MAX_TAGS = 6;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
}

/** "2026-10-03" → Date(UTC 자정). 미래 날짜·형식 오류는 거부. */
export function parseVisitDate(v: unknown, now = new Date()): Date | null | "invalid" {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "invalid";
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.getTime() > now.getTime() + 36 * 3600 * 1000) return "invalid";
  return d;
}

export function parsePhotos(v: unknown, isAllowed: (url: string) => boolean): Result<PhotoInput[]> {
  if (v === undefined || v === null) return { ok: true, data: [] };
  if (!Array.isArray(v)) return { ok: false, error: "사진 형식이 올바르지 않아요." };
  if (v.length > MAX_PHOTOS_PER_REQUEST) return { ok: false, error: `사진은 한 번에 ${MAX_PHOTOS_PER_REQUEST}장까지 올릴 수 있어요.` };
  const out: PhotoInput[] = [];
  for (const p of v) {
    const o = p as Record<string, unknown>;
    if (!o || typeof o.url !== "string" || !isAllowed(o.url)) return { ok: false, error: "허용되지 않은 사진 주소예요. 다시 올려주세요." };
    const dim = (n: unknown) => (typeof n === "number" && n > 0 && n < 20000 ? Math.round(n) : undefined);
    out.push({ url: o.url, width: dim(o.width), height: dim(o.height) });
  }
  return { ok: true, data: out };
}

/** 사용자 태그 — 허용 목록(기존 공통 태그)에 있는 것만, 중복 제거, 최대 MAX_TAGS. */
export function parseTags(v: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter((t) => allowed.has(t)))].slice(0, MAX_TAGS);
}

export function parseCreateInput(raw: unknown, ctx: { isAllowedPhoto: (url: string) => boolean; allowedTags: Set<string>; spaceName?: string | null }): Result<CreateEntryInput> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const spaceId = str(o.spaceId, 64);
  const placeName = str(o.placeName, 80) ?? (spaceId ? ctx.spaceName ?? null : null);
  if (!placeName) return { ok: false, error: "공간 이름을 입력해주세요." };
  const photos = parsePhotos(o.photos, ctx.isAllowedPhoto);
  if (!photos.ok) return photos;
  const fromPhoto = o.fromPhoto === true;
  if (fromPhoto && photos.data.length === 0) return { ok: false, error: "사진을 한 장 이상 골라주세요." };
  const visitedOn = parseVisitDate(o.visitedOn);
  if (visitedOn === "invalid") return { ok: false, error: "방문 날짜가 올바르지 않아요." };
  const status = o.status === "VISITED" ? "VISITED" : "SAVED";
  return {
    ok: true,
    data: {
      spaceId,
      placeName,
      placeArea: str(o.placeArea, 40),
      status,
      addVisit: o.addVisit !== false,
      sourceUrl: typeof o.sourceUrl === "string" && o.sourceUrl.trim() ? o.sourceUrl.trim().slice(0, 1000) : null,
      fromPhoto,
      visitedOn,
      memo: str(o.memo, 200),
      tags: parseTags(o.tags, ctx.allowedTags),
      photos: photos.data,
    },
  };
}

export function parsePatchInput(raw: unknown, allowedTags: Set<string>): Result<PatchEntryInput> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out: PatchEntryInput = {};
  if ("placeName" in o) {
    const n = str(o.placeName, 80);
    if (!n) return { ok: false, error: "공간 이름은 비울 수 없어요." };
    out.placeName = n;
  }
  if ("placeArea" in o) out.placeArea = str(o.placeArea, 40);
  if ("memo" in o) out.memo = str(o.memo, 200);
  if ("tags" in o) out.tags = parseTags(o.tags, allowedTags);
  if ("wantAgain" in o) out.wantAgain = typeof o.wantAgain === "boolean" ? o.wantAgain : null;
  if ("status" in o) {
    if (o.status !== "SAVED" && o.status !== "VISITED") return { ok: false, error: "상태 값이 올바르지 않아요." };
    out.status = o.status;
  }
  return { ok: true, data: out };
}

export function parseVisitInput(raw: unknown, isAllowedPhoto: (url: string) => boolean): Result<VisitInput> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const visitedOn = parseVisitDate(o.visitedOn);
  if (visitedOn === "invalid") return { ok: false, error: "방문 날짜가 올바르지 않아요." };
  const photos = parsePhotos(o.photos, isAllowedPhoto);
  if (!photos.ok) return photos;
  return { ok: true, data: { visitedOn, memo: str(o.memo, 200), photos: photos.data } };
}

/** 서명 업로드로 사용자 폴더(archive/<userId>/)에 올라간 이 서비스의 Cloudinary 사진만 허용. */
export function isAllowedArchivePhoto(url: string, cloudName: string | undefined, userId: string): boolean {
  if (!cloudName) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && u.pathname.startsWith(`/${cloudName}/image/upload/`) && u.pathname.includes(`/archive/${userId}/`);
  } catch {
    return false;
  }
}

export function parseVisitPatch(raw: unknown): Result<{ visitId: string; visitedOn?: Date | null; memo?: string | null }> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const visitId = str(o.visitId, 64);
  if (!visitId) return { ok: false, error: "방문을 찾을 수 없어요." };
  const out: { visitId: string; visitedOn?: Date | null; memo?: string | null } = { visitId };
  if ("visitedOn" in o) {
    const d = parseVisitDate(o.visitedOn);
    if (d === "invalid") return { ok: false, error: "방문 날짜가 올바르지 않아요." };
    out.visitedOn = d;
  }
  if ("memo" in o) out.memo = str(o.memo, 200);
  return { ok: true, data: out };
}
