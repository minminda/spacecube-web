/* ── 일반 문화공간 일괄 등록 계획(순수 함수) ─────────────────────────────────
   scripts/bulk-import-spaces.ts가 쓴다. DB·파일·네트워크를 만지지 않고 "입력 → 등록 계획"만 만든다.
   원칙: EditorialSpace(공개 계층)에 새 행을 만들 뿐, 기존 행은 절대 수정하지 않는다.
   Episode · Scene · Cube · 운영자 · 방명록 · 운영 Space는 만들지 않고, cubeAvailable은 항상 false.
   개별 필드 검증은 관리자 저장과 같은 parseSpaceInput을 그대로 쓴다. ── */

import { parseSpaceInput, type SpaceInput } from "./input";
import { normalizeArea } from "./area";
import { adviseTags, RECOMMENDED_TAGS } from "./spaceQuality";

/** 입력 파일에서 허용하는 필드 — 이 밖의 필드(특히 episode · scene · cube · story 등)는 오류로 막는다 */
const ALLOWED_FIELDS = new Set([
  "slug", "name", "area", "category", "coverImage", "coverPosition", "summary", "tags",
  "description", "address", "mapUrl", "openingHours", "instagram", "website", "images",
  "fictional", "note",
]);

export interface ImportCtx {
  /** DB의 모든 공개 계층 공간(초안 · 보관 · 가상 포함) — 중복 검사용 */
  existing: { slug: string; name: string }[];
  /** 지역 정본 — 관리자 District 이름 + 이미 등록된 공간의 지역 */
  areas: string[];
  /** 공간 유형 정본 — "공간 유형" 카테고리 태그 + 이미 등록된 유형 */
  types: string[];
  /** 태그 정본 — 활성 Tag 이름 + 이미 쓰는 태그 */
  tags: string[];
  /** true면 정본에 없는 유형 · 태그를 오류가 아니라 경고로만 */
  allowNew: boolean;
}

export type ItemStatus = "create" | "skip" | "error";

export interface PlanItem {
  index: number;
  status: ItemStatus;
  slug: string;
  name: string;
  /** status가 create일 때만 */
  data?: SpaceInput;
  /** 입력 파일의 fictional=true → isDemo(어디에도 공개되지 않음) */
  fictional: boolean;
  /** 로컬 파일 경로로 적힌 이미지(적용 때 업로드) */
  localImages: string[];
  errors: string[];
  warnings: string[];
}

const nameKey = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const areaKey = (s: string) => nameKey(normalizeArea(s) ?? s);
const isUrl = (s: string) => /^https?:\/\//i.test(s);

/** 파일 최상위는 배열이거나 { spaces: [...] } */
export function extractEntries(raw: unknown): { ok: true; entries: unknown[] } | { ok: false; error: string } {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { spaces?: unknown }).spaces) ? (raw as { spaces: unknown[] }).spaces : null;
  if (!list) return { ok: false, error: "최상위가 배열이거나 { \"spaces\": [...] } 형식이어야 해요." };
  if (list.length === 0) return { ok: false, error: "등록할 공간이 하나도 없어요." };
  if (list.length > 100) return { ok: false, error: "한 번에 100곳까지만 처리해요." };
  return { ok: true, entries: list };
}

export function planImport(entries: unknown[], ctx: ImportCtx): PlanItem[] {
  const dbSlugs = new Map(ctx.existing.map((e) => [e.slug, e.name]));
  const dbNames = new Map(ctx.existing.map((e) => [nameKey(e.name), e.slug]));
  const areaByKey = new Map(ctx.areas.map((a) => [areaKey(a), a]));
  const typeByKey = new Map(ctx.types.map((t) => [nameKey(t), t]));
  const seenSlug = new Map<string, number>();
  const seenName = new Map<string, number>();

  return entries.map((raw, index): PlanItem => {
    const item: PlanItem = { index: index + 1, status: "create", slug: "", name: "", fictional: false, localImages: [], errors: [], warnings: [] };
    const fail = (m: string) => item.errors.push(m);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      fail("공간 항목 형식이 올바르지 않아요.");
      item.status = "error";
      return item;
    }
    const o = { ...(raw as Record<string, unknown>) };
    item.slug = typeof o.slug === "string" ? o.slug.trim() : "";
    item.name = typeof o.name === "string" ? o.name.trim() : "";

    const extra = Object.keys(o).filter((k) => !ALLOWED_FIELDS.has(k));
    if (extra.length > 0) fail(`허용하지 않는 필드: ${extra.join(", ")} (Episode · Scene · Cube · 운영자 · 방명록은 이 방식으로 만들지 않아요)`);
    if (o.fictional !== undefined && typeof o.fictional !== "boolean") fail("fictional은 true/false여야 해요.");
    item.fictional = o.fictional === true;

    // 로컬 파일 경로 이미지는 적용 때 업로드한다 — 검증은 임시 URL로 치환해 같은 규칙을 쓴다.
    const swap = (v: unknown): unknown => {
      if (typeof v !== "string" || !v.trim() || isUrl(v.trim())) return v;
      item.localImages.push(v.trim());
      return "https://pending.local/" + encodeURIComponent(v.trim());
    };
    o.coverImage = swap(o.coverImage);
    if (Array.isArray(o.images)) o.images = o.images.map(swap);
    // 일괄 등록은 항상 Cube 없는 일반 공간
    o.cubeAvailable = false;
    delete o.story;

    const parsed = parseSpaceInput({ ...o, fictional: undefined, note: undefined });
    if (!parsed.ok) {
      fail(parsed.error);
      item.status = "error";
      return item;
    }
    const d = parsed.data;
    item.slug = d.slug;
    item.name = d.name;

    // 최소 데이터
    if (!d.coverImage) fail("대표 이미지(coverImage)가 필요해요.");
    if (!d.summary) fail("한 줄 소개(summary)가 필요해요.");
    if (d.tags.length < RECOMMENDED_TAGS.min || d.tags.length > RECOMMENDED_TAGS.max) fail(`태그는 ${RECOMMENDED_TAGS.min}~${RECOMMENDED_TAGS.max}개여야 해요(지금 ${d.tags.length}개).`);

    // 지역 · 유형 · 태그 정본 — 정본 표기로 통일
    const area = areaByKey.get(areaKey(d.area));
    if (!area) fail(`지역 "${d.area}"이(가) 정본에 없어요. 사용 가능: ${ctx.areas.join(" · ")}`);
    else d.area = area;
    const type = typeByKey.get(nameKey(d.category));
    if (type) d.category = type;
    else (ctx.allowNew ? item.warnings : item.errors).push(`공간 유형 "${d.category}"이(가) 정본에 없어요. 사용 가능: ${ctx.types.join(" · ")}`);
    const adv = adviseTags(d.tags, ctx.tags);
    const byNorm = new Map(ctx.tags.map((t) => [t.replace(/\s+/g, "").toLowerCase(), t]));
    d.tags = [...new Set(d.tags.map((t) => byNorm.get(t.replace(/\s+/g, "").toLowerCase()) ?? t))];
    if (adv.unknown.length > 0) (ctx.allowNew ? item.warnings : item.errors).push(`정본에 없는 태그: ${adv.unknown.join(", ")}`);
    if (adv.duplicates.length > 0) item.warnings.push(`중복 태그 정리됨: ${adv.duplicates.join(", ")}`);

    // 입력 파일 안 중복
    const sk = d.slug, nk = nameKey(d.name);
    if (seenSlug.has(sk)) fail(`파일 안에서 slug "${sk}"이(가) ${seenSlug.get(sk)}번 항목과 겹쳐요.`);
    if (seenName.has(nk)) fail(`파일 안에서 공간명 "${d.name}"이(가) ${seenName.get(nk)}번 항목과 겹쳐요.`);
    seenSlug.set(sk, item.index);
    seenName.set(nk, item.index);

    // DB 중복 — 기존 공간은 절대 수정하지 않는다
    if (dbSlugs.has(sk)) {
      const sameName = nameKey(dbSlugs.get(sk)!) === nk;
      if (sameName && item.errors.length === 0) {
        item.status = "skip"; // 이전 실행에서 이미 등록된 공간 — 재실행해도 아무것도 안 한다
        item.warnings.push("이미 등록되어 있어요(수정하지 않음).");
        return item;
      }
      fail(`slug "${sk}"이(가) 이미 다른 공간("${dbSlugs.get(sk)}")에서 쓰고 있어요.`);
    } else if (dbNames.has(nk)) {
      fail(`공간명 "${d.name}"이(가) 이미 등록돼 있어요(slug: ${dbNames.get(nk)}).`);
    }

    if (item.errors.length > 0) {
      item.status = "error";
      return item;
    }
    item.data = d;
    return item;
  });
}

export function summarize(items: PlanItem[]) {
  return {
    total: items.length,
    create: items.filter((i) => i.status === "create").length,
    skip: items.filter((i) => i.status === "skip").length,
    error: items.filter((i) => i.status === "error").length,
    fictional: items.filter((i) => i.status === "create" && i.fictional).length,
  };
}

/** 로컬 경로 이미지를 업로드된 URL로 바꾼다(적용 단계). */
export function withUploadedImages(d: SpaceInput, uploaded: Map<string, string>): SpaceInput {
  const fix = (u: string) => {
    const m = /^https:\/\/pending\.local\/(.+)$/.exec(u);
    return m ? uploaded.get(decodeURIComponent(m[1])) ?? u : u;
  };
  return { ...d, coverImage: d.coverImage ? fix(d.coverImage) : null, images: d.images.map(fix) };
}
