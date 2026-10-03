/* ── Editorial CMS 입력 검증(순수 함수) ─────────────────────────────────────
   관리자 API가 DB에 쓰기 전에 반드시 거친다. JSON 본문 블록은 DB 레벨 타입 보장이 없으므로
   여기서 블록 종류별 필드를 엄격히 검증·정규화한다(모르는 필드는 버림). ── */

import { isValidSlug, normalizeSlug } from "@/lib/slug";
import type { BlockImage, CurationPerspectiveValue, EditorialBlock, EditorialStatusValue, HomeFeedItem } from "./types";
import { CURATION_PERSPECTIVES, EDITORIAL_STATUSES } from "./types";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX = { short: 120, medium: 300, long: 20000, url: 1000, blocks: 80, images: 20, gallery: 12, qna: 30, tags: 12 };

class InputError extends Error {}
function fail(msg: string): never {
  throw new InputError(msg);
}

function obj(raw: unknown, what = "요청"): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail(`${what} 형식이 올바르지 않아요.`);
  return raw as Record<string, unknown>;
}

function reqStr(v: unknown, label: string, max = MAX.short): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) fail(`${label}을(를) 입력해주세요.`);
  if (s.length > max) fail(`${label}은(는) ${max}자 이하로 입력해주세요.`);
  return s;
}

function optStr(v: unknown, label: string, max = MAX.short): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") fail(`${label} 형식이 올바르지 않아요.`);
  const s = v.trim();
  if (!s) return null;
  if (s.length > max) fail(`${label}은(는) ${max}자 이하로 입력해주세요.`);
  return s;
}

const URL_RE = /^https?:\/\/\S+$/i;
function optUrl(v: unknown, label: string): string | null {
  const s = optStr(v, label, MAX.url);
  if (s && !URL_RE.test(s)) fail(`${label}은(는) http(s)://로 시작하는 주소여야 해요.`);
  return s;
}
function reqUrl(v: unknown, label: string): string {
  const s = optUrl(v, label);
  if (!s) fail(`${label}을(를) 넣어주세요.`);
  return s;
}

function strList(v: unknown, label: string, max: number, each: (x: unknown) => string): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fail(`${label} 형식이 올바르지 않아요.`);
  if (v.length > max) fail(`${label}은(는) 최대 ${max}개까지 가능해요.`);
  return v.map(each);
}

function slugOf(v: unknown): string {
  const slug = normalizeSlug(typeof v === "string" ? v : "");
  if (!slug || !isValidSlug(slug)) fail("주소(slug)는 영문 소문자·숫자·하이픈만 가능해요.");
  if (slug.length > 80) fail("주소(slug)는 80자 이하로 입력해주세요.");
  return slug;
}

function posInt(v: unknown, label: string): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 9999) fail(`${label}은(는) 1 이상의 정수여야 해요.`);
  return n;
}

function wrap<T>(fn: () => T): ParseResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    if (e instanceof InputError) return { ok: false, error: e.message };
    throw e;
  }
}

/* ── 공간 콘텐츠 ── */

export interface SpaceInput {
  slug: string;
  name: string;
  area: string;
  category: string;
  summary: string | null;
  description: string | null;
  coverImage: string | null;
  coverPosition: string | null;
  images: string[];
  tags: string[];
  address: string | null;
  openingHours: string | null;
  mapUrl: string | null;
  instagram: string | null;
  website: string | null;
  cubeAvailable: boolean;
  /** 함께한 공간의 운영자 전체 이야기(블록) — 일반 공간은 보통 비어 있다 */
  story: EditorialBlock[];
}

export function parseSpaceInput(raw: unknown): ParseResult<SpaceInput> {
  return wrap(() => {
    const o = obj(raw);
    const tags = strList(o.tags, "태그", MAX.tags, (t) => reqStr(t, "태그", 30));
    return {
      slug: slugOf(o.slug),
      name: reqStr(o.name, "공간 이름"),
      area: reqStr(o.area, "지역", 60),
      category: reqStr(o.category, "공간 종류", 60),
      summary: optStr(o.summary, "한 줄 소개", MAX.medium),
      description: optStr(o.description, "공간 소개", MAX.long),
      coverImage: optUrl(o.coverImage, "대표 이미지"),
      coverPosition: optStr(o.coverPosition, "대표 이미지 초점", 40),
      images: strList(o.images, "사진", MAX.images, (u) => reqUrl(u, "사진")),
      tags: [...new Set(tags)],
      address: optStr(o.address, "주소", MAX.medium),
      openingHours: optStr(o.openingHours, "운영 시간", MAX.medium),
      mapUrl: optUrl(o.mapUrl, "지도 링크"),
      instagram: optUrl(o.instagram, "Instagram"),
      website: optUrl(o.website, "웹사이트"),
      cubeAvailable: o.cubeAvailable === true,
      story: parseBlockList(o.story),
    };
  });
}

/* ── 본문 블록 ── */

function blockImage(raw: unknown, label: string): BlockImage {
  const o = obj(raw, label);
  const img: BlockImage = { url: reqUrl(o.url, label) };
  const alt = optStr(o.alt, `${label} 대체 텍스트`, MAX.medium);
  const caption = optStr(o.caption, `${label} 캡션`, MAX.medium);
  if (alt) img.alt = alt;
  if (caption) img.caption = caption;
  if (typeof o.width === "number" && o.width > 0) img.width = Math.round(o.width);
  if (typeof o.height === "number" && o.height > 0) img.height = Math.round(o.height);
  return img;
}

function parseBlock(raw: unknown, index: number): EditorialBlock {
  const n = index + 1;
  const o = obj(raw, `${n}번째 블록`);
  switch (o.type) {
    case "TEXT": {
      const b: EditorialBlock = { type: "TEXT", text: reqStr(o.text, `${n}번째 블록(텍스트)`, MAX.long) };
      if (o.small === true) b.small = true;
      return b;
    }
    case "HEADING":
      return { type: "HEADING", text: reqStr(o.text, `${n}번째 블록(소제목)`, MAX.medium) };
    case "IMAGE": {
      const b: EditorialBlock = { type: "IMAGE", image: blockImage(o.image, `${n}번째 블록(이미지)`) };
      if (o.wide === true) b.wide = true;
      return b;
    }
    case "IMAGE_TEXT": {
      const b: EditorialBlock = {
        type: "IMAGE_TEXT",
        image: blockImage(o.image, `${n}번째 블록(이미지)`),
        text: reqStr(o.text, `${n}번째 블록(텍스트)`, MAX.long),
      };
      const title = optStr(o.title, `${n}번째 블록 제목`);
      if (title) b.title = title;
      if (o.reverse === true) b.reverse = true;
      return b;
    }
    case "GALLERY": {
      if (!Array.isArray(o.images) || o.images.length === 0) fail(`${n}번째 블록(갤러리)에 사진을 1장 이상 넣어주세요.`);
      if (o.images.length > MAX.gallery) fail(`${n}번째 블록(갤러리)은 최대 ${MAX.gallery}장까지 가능해요.`);
      return { type: "GALLERY", images: o.images.map((im) => blockImage(im, `${n}번째 블록(갤러리 사진)`)) };
    }
    case "QUOTE": {
      const b: EditorialBlock = { type: "QUOTE", text: reqStr(o.text, `${n}번째 블록(인용)`, MAX.medium) };
      const cite = optStr(o.cite, `${n}번째 블록 출처`);
      if (cite) b.cite = cite;
      return b;
    }
    case "QNA": {
      if (!Array.isArray(o.items) || o.items.length === 0) fail(`${n}번째 블록(Q&A)에 질문을 1개 이상 넣어주세요.`);
      if (o.items.length > MAX.qna) fail(`${n}번째 블록(Q&A)은 최대 ${MAX.qna}개까지 가능해요.`);
      return {
        type: "QNA",
        items: o.items.map((it) => {
          const q = obj(it, `${n}번째 블록 질문`);
          return { q: reqStr(q.q, `${n}번째 블록 질문`, MAX.medium), a: reqStr(q.a, `${n}번째 블록 답변`, MAX.long) };
        }),
      };
    }
    case "SPACE_CARD": {
      const b: EditorialBlock = { type: "SPACE_CARD", spaceId: reqStr(o.spaceId, `${n}번째 블록(공간 카드)의 공간`, 64) };
      const note = optStr(o.note, `${n}번째 블록 메모`, MAX.medium);
      if (note) b.note = note;
      return b;
    }
    case "DIVIDER":
      return { type: "DIVIDER" };
    default:
      fail(`${n}번째 블록의 종류를 알 수 없어요.`);
  }
}

export function parseBlocks(raw: unknown): ParseResult<EditorialBlock[]> {
  return wrap(() => parseBlockList(raw));
}

function parseBlockList(raw: unknown): EditorialBlock[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) fail("본문 블록 형식이 올바르지 않아요.");
  if (raw.length > MAX.blocks) fail(`본문 블록은 최대 ${MAX.blocks}개까지 가능해요.`);
  return raw.map(parseBlock);
}

/** 블록 본문이 참조하는 공간 콘텐츠 id(SPACE_CARD). */
export function collectBlockSpaceIds(blocks: EditorialBlock[]): string[] {
  return [...new Set(blocks.flatMap((b) => (b.type === "SPACE_CARD" ? [b.spaceId] : [])))];
}

/** DB에서 읽은 blocks(Json)를 안전하게 배열로 — 검증 실패 블록은 건너뛴다(렌더 방어용). */
export function readStoredBlocks(raw: unknown): EditorialBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: EditorialBlock[] = [];
  raw.forEach((b, i) => {
    try {
      out.push(parseBlock(b, i));
    } catch {
      /* 손상된 블록은 공개 화면에서 제외 */
    }
  });
  return out;
}

/* ── 큐레이션 / 피플 ── */

export interface LinkedSpaceInput {
  spaceId: string;
  note: string | null;
}

function linkedSpaces(raw: unknown): LinkedSpaceInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) fail("연결 공간 형식이 올바르지 않아요.");
  if (raw.length > 60) fail("연결 공간은 최대 60곳까지 가능해요.");
  const seen = new Set<string>();
  return raw.map((it, i) => {
    const o = obj(it, `${i + 1}번째 연결 공간`);
    const spaceId = reqStr(o.spaceId, `${i + 1}번째 연결 공간`, 64);
    if (seen.has(spaceId)) fail("같은 공간이 두 번 연결되어 있어요.");
    seen.add(spaceId);
    return { spaceId, note: optStr(o.note, `${i + 1}번째 연결 공간 메모`, MAX.medium) };
  });
}

interface DocBase {
  slug: string;
  number: number;
  title: string;
  summary: string;
  coverImage: string | null;
  coverPosition: string | null;
  blocks: EditorialBlock[];
  spaces: LinkedSpaceInput[];
}

export interface CurationInput extends DocBase {
  /** 지역(선택) — 지역 × 관점 큐레이션이면 입력, 주제형이면 비움 */
  area: string | null;
  /** 관점(선택) — SITUATION(상황) / PURPOSE(취향·목적) */
  perspective: CurationPerspectiveValue | null;
}
export interface PersonInput extends DocBase {
  subject: string | null;
}
export interface ThoughtInput extends DocBase {
  /** 이야기가 시작된 장면·장소(선택) */
  scene: string | null;
}

function docBase(o: Record<string, unknown>): DocBase {
  return {
    slug: slugOf(o.slug),
    number: posInt(o.number, "번호"),
    title: reqStr(o.title, "제목", 200),
    summary: reqStr(o.summary, "요약", MAX.medium * 2),
    coverImage: optUrl(o.coverImage, "대표 이미지"),
    coverPosition: optStr(o.coverPosition, "대표 이미지 초점", 40),
    blocks: parseBlockList(o.blocks),
    spaces: linkedSpaces(o.spaces),
  };
}

export function parseCurationInput(raw: unknown): ParseResult<CurationInput> {
  return wrap(() => {
    const o = obj(raw);
    const p = o.perspective;
    if (p !== undefined && p !== null && p !== "" && !(CURATION_PERSPECTIVES as readonly unknown[]).includes(p)) fail("큐레이션 관점 값이 올바르지 않아요.");
    const perspective = typeof p === "string" && p ? (p as CurationPerspectiveValue) : null;
    return { ...docBase(o), area: optStr(o.area, "지역", 60), perspective };
  });
}

export function parsePersonInput(raw: unknown): ParseResult<PersonInput> {
  return wrap(() => {
    const o = obj(raw);
    return { ...docBase(o), subject: optStr(o.subject, "소개 대상", 60) };
  });
}

export function parseThoughtInput(raw: unknown): ParseResult<ThoughtInput> {
  return wrap(() => {
    const o = obj(raw);
    return { ...docBase(o), scene: optStr(o.scene, "시작 장면", 80) };
  });
}

/* ── 상태 / 홈 설정 ── */

export function parseStatus(raw: unknown): ParseResult<EditorialStatusValue> {
  return wrap(() => {
    const s = obj(raw).status;
    if (typeof s !== "string" || !(EDITORIAL_STATUSES as readonly string[]).includes(s)) fail("상태 값이 올바르지 않아요.");
    return s as EditorialStatusValue;
  });
}

export interface HomeInput {
  heroSpaceId: string | null;
  featuredCurationId: string | null;
  featuredSpaceIds: string[];
  feed: HomeFeedItem[];
}

export function parseHomeInput(raw: unknown): ParseResult<HomeInput> {
  return wrap(() => {
    const o = obj(raw);
    const featuredSpaceIds = strList(o.featuredSpaceIds, "공간 둘러보기", 24, (x) => reqStr(x, "공간", 64));
    if (new Set(featuredSpaceIds).size !== featuredSpaceIds.length) fail("공간 둘러보기에 같은 공간이 두 번 있어요.");
    if (o.feed !== undefined && o.feed !== null && !Array.isArray(o.feed)) fail("최근 이야기 형식이 올바르지 않아요.");
    const feedRaw = (o.feed as unknown[] | undefined) ?? [];
    if (feedRaw.length > 12) fail("최근 이야기는 최대 12개까지 가능해요.");
    const feed = feedRaw.map((it, i): HomeFeedItem => {
      const f = obj(it, `최근 이야기 ${i + 1}번째`);
      const id = reqStr(f.id, `최근 이야기 ${i + 1}번째 항목`, 64);
      if (f.kind === "curation" || f.kind === "person") return { kind: f.kind, id };
      if (f.kind === "space") {
        const headline = optStr(f.headline, `최근 이야기 ${i + 1}번째 문구`, MAX.medium);
        return headline ? { kind: "space", id, headline } : { kind: "space", id };
      }
      fail(`최근 이야기 ${i + 1}번째 항목의 종류가 올바르지 않아요.`);
    });
    return {
      heroSpaceId: optStr(o.heroSpaceId, "히어로 공간", 64),
      featuredCurationId: optStr(o.featuredCurationId, "대표 큐레이션", 64),
      featuredSpaceIds,
      feed,
    };
  });
}

/** 저장된 홈 feed(Json) 읽기 — 형식이 깨진 항목은 버린다. */
export function readStoredFeed(raw: unknown): HomeFeedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const r = parseHomeInput({ feed: [item] });
    return r.ok ? r.data.feed : [];
  });
}
