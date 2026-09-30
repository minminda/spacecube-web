/* ── 에디토리얼 콘텐츠 타입(1차 개편, 정적 데이터용) ─────────────────────────
   CURATION / PEOPLE은 이번 단계에서 DB 모델·관리자 CMS 없이 src/content/의 정적 데이터로
   운영한다. 본문은 처음부터 블록 배열로 작성해 두어, 2단계에서 그대로 DB(Json 컬럼 —
   예: 기존 ContentStory.bodyBlocks 또는 신규 모델)로 옮길 수 있게 한다.

   Episode / Scene(QR 이야기)은 이 구조로 옮기지 않는다 — 잠금·방문 횟수·읽기 계측이
   얽혀 있어 별도 판단 대상이다. ── */

/** 이미지 참조 — 직접 URL이거나, 기존 Space의 대표사진을 slug로 빌려 쓴다(DB 조회만). */
export interface ImageRef {
  src?: string;
  /** 이 slug 공간의 대표사진(Space.imageUrl)을 사용 */
  spaceSlug?: string;
  alt: string;
  caption?: string;
}

export type ContentBlock =
  | { type: "TEXT"; text: string }
  | { type: "HEADING"; text: string }
  | { type: "IMAGE"; image: ImageRef; wide?: boolean }
  | { type: "IMAGE_GALLERY"; images: ImageRef[] }
  | { type: "IMAGE_TEXT"; image: ImageRef; text: string; reverse?: boolean }
  | { type: "QUOTE"; text: string; cite?: string }
  | { type: "QNA"; items: { q: string; a: string }[] }
  | { type: "SPACE_CARD"; spaceSlug: string; note?: string }
  | { type: "DIVIDER" }
  | { type: "CAPTION"; text: string };

export interface Curation {
  slug: string;
  /** 표시 번호 — "CURATION 001" */
  number: number;
  region: string;
  title: string;
  summary: string;
  cover: ImageRef;
  /** 선정 공간(기존 Space.slug, 순서대로) */
  spaceSlugs: string[];
  blocks: ContentBlock[];
  publishedAt: string; // YYYY-MM-DD
}

export interface Person {
  slug: string;
  number: number;
  /** 목록/카드 제목 */
  title: string;
  /** 소개 대상(이름 또는 호칭). 원고 전이면 비워둔다. */
  subject?: string;
  summary: string;
  cover?: ImageRef;
  /** 이 사람이 머문 공간 중 공간큐브에 등록된 곳(선택) */
  spaceSlugs: string[];
  blocks: ContentBlock[];
  publishedAt: string;
}
