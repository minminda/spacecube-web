/* ── Editorial CMS 타입 ────────────────────────────────────────────────────
   홈페이지(발견 영역) 콘텐츠 전용. 현장 Cube 운영 모델(Space/Episode/Scene 등)과 무관하다.
   - EditorialBlock: DB(EditorialCuration.blocks / EditorialPerson.blocks, JSON)에 저장되는 본문 블록.
     서버 저장 전 src/lib/editorial/input.ts의 parseBlocks로 반드시 검증한다.
   - *View: 공개 페이지·컴포넌트가 쓰는 형태(DB 행을 queries.ts에서 변환). ── */

export const EDITORIAL_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type EditorialStatusValue = (typeof EDITORIAL_STATUSES)[number];

export interface BlockImage {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export type EditorialBlock =
  | { type: "TEXT"; text: string; small?: boolean }
  | { type: "HEADING"; text: string }
  | { type: "IMAGE"; image: BlockImage; wide?: boolean }
  | { type: "IMAGE_TEXT"; image: BlockImage; title?: string; text: string; reverse?: boolean }
  | { type: "GALLERY"; images: BlockImage[] }
  | { type: "QUOTE"; text: string; cite?: string }
  | { type: "QNA"; items: { q: string; a: string }[] }
  | { type: "SPACE_CARD"; spaceId: string; note?: string }
  | { type: "DIVIDER" };

export type EditorialBlockType = EditorialBlock["type"];

export const BLOCK_TYPES: { type: EditorialBlockType; label: string; description: string }[] = [
  { type: "TEXT", label: "텍스트", description: "본문 문단(빈 줄로 문단 구분)" },
  { type: "HEADING", label: "소제목", description: "본문 중간 제목" },
  { type: "IMAGE", label: "이미지", description: "사진 한 장 + 캡션" },
  { type: "IMAGE_TEXT", label: "이미지 + 텍스트", description: "사진과 글을 나란히(개인적인 장소 소개 등)" },
  { type: "GALLERY", label: "갤러리", description: "사진 여러 장" },
  { type: "QUOTE", label: "인용", description: "강조 문장" },
  { type: "QNA", label: "Q&A", description: "질문과 답" },
  { type: "SPACE_CARD", label: "공간 카드", description: "공간 콘텐츠 연결" },
  { type: "DIVIDER", label: "구분선", description: "" },
];

export interface ResolvedImage {
  src: string | null;
  alt: string;
  caption?: string;
  position?: string;
}

/** 공개 페이지용 공간 콘텐츠. */
export interface SpaceView {
  id: string;
  slug: string;
  name: string;
  area: string;
  category: string;
  summary?: string;
  description?: string[];
  coverImage?: string;
  coverPosition?: string;
  images?: string[];
  tags?: string[];
  address?: string;
  hours?: string;
  mapUrl?: string;
  instagram?: string;
  website?: string;
  cubeAvailable: boolean;
  status: EditorialStatusValue;
}

export interface LinkedSpace {
  space: SpaceView;
  note?: string;
}

export interface CurationView {
  id: string;
  slug: string;
  number: number;
  /** 지역(선택) — 없으면 주제형 큐레이션 */
  area?: string;
  title: string;
  summary: string;
  cover: ResolvedImage;
  spaces: LinkedSpace[];
  blocks: EditorialBlock[];
  status: EditorialStatusValue;
  publishedAt: Date | null;
}

/** "CURATION 001 · 문래" (지역이 없으면 번호만) */
export function curationLabel(c: { number: number; area?: string | null }): string {
  return c.area ? `${formatCurationNumber(c.number)} · ${c.area}` : formatCurationNumber(c.number);
}

export interface PersonView {
  id: string;
  slug: string;
  number: number;
  title: string;
  subject?: string;
  summary: string;
  cover: ResolvedImage;
  spaces: LinkedSpace[];
  blocks: EditorialBlock[];
  status: EditorialStatusValue;
  publishedAt: Date | null;
}

export type HomeFeedItem =
  | { kind: "curation"; id: string }
  | { kind: "person"; id: string }
  | { kind: "space"; id: string; headline?: string };

export function spaceHref(slug: string): string {
  return `/spaces/${slug}`;
}

export function spaceCoverImage(space: Pick<SpaceView, "coverImage" | "name" | "coverPosition">): ResolvedImage {
  return { src: space.coverImage ?? null, alt: space.name, position: space.coverPosition };
}

export function formatCurationNumber(n: number): string {
  return `CURATION ${String(n).padStart(3, "0")}`;
}

export function formatPeopleNumber(n: number): string {
  return `PEOPLE ${String(n).padStart(3, "0")}`;
}

export const STATUS_LABEL: Record<EditorialStatusValue, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행",
  ARCHIVED: "보관",
};

/** 발행일 표시(KST) — "2026.09.30" */
export function formatEditorialDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return parts.replaceAll("-", ".");
}

/* ── HOME 콘텐츠 스트림(CURATION / PEOPLE / SPACE 통합) ── */

export type ContentKind = "curation" | "person" | "space";

export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  curation: "CURATION",
  person: "PEOPLE",
  space: "SPACE",
};

/** HOME LATEST·FEED가 쓰는 공통 카드 데이터(직렬화 가능 — 클라이언트 컴포넌트로 전달). */
export interface ContentItem {
  key: string;
  kind: ContentKind;
  /** 예: "CURATION 001 · 연남", "PEOPLE 001", "연남동 · 독립서점" */
  eyebrow: string;
  title: string;
  summary?: string;
  /** 보조 정보 — 예: "연남에서 발견한 3개의 공간" */
  meta?: string;
  href: string;
  image: ResolvedImage;
  /** 표시용 발행일(KST, "2026.09.30") — 초안 미리보기는 빈 문자열 */
  date: string;
  status: EditorialStatusValue;
}
