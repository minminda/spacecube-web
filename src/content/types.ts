/* ── 에디토리얼 콘텐츠 타입(일반 홈페이지 = "발견" 영역) ─────────────────────
   공간큐브에는 서로 분리된 두 경험이 있다.
   A. 일반 홈페이지(HOME / CURATION / PEOPLE / SPACE / ABOUT) — 공개 Editorial Content.
      전부 src/content/의 정적 데이터로 운영하며 DB를 조회하지 않는다.
   B. 현장 Cube(/c/[code] → /space/[slug] 이하 Episode·Scene → Guestbook) — 실제 방문자 전용.
      기존 Prisma Space/Episode/Scene은 이 영역의 운영 데이터다.
   A는 B의 데이터·라우트(/space/[slug]/**)를 참조하거나 링크하지 않는다. 홈페이지 SPACE의
   slug는 DB Space.slug와 무관한 별도 네임스페이스(/spaces/[slug])다.

   본문은 블록 배열로 작성해 두어, 2단계에서 그대로 별도 콘텐츠 저장소로 옮길 수 있게 한다. ── */

/** 이미지 참조 — 직접 URL이거나, 홈페이지 SPACE(정적 데이터)의 대표사진을 slug로 빌려 쓴다. */
export interface ImageRef {
  src?: string;
  /** 이 slug의 홈페이지 SPACE(src/content/spaces.ts) coverImage를 사용 */
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

/**
 * 홈페이지용 SPACE — 공간큐브가 발견하고 기록한 실제 공간(공개 정보만).
 * Cube 설치 여부와 무관하게 등록할 수 있다. Cube 운영 데이터(DB Space)와 연결하지 않는다.
 */
export interface EditorialSpace {
  slug: string;
  name: string;
  /** 지역(동네) — 예: "연남동" */
  area: string;
  /** 공간 종류 — 예: "독립서점" */
  category: string;
  /** 한 줄 소개 */
  summary?: string;
  /** 공간 소개(문단). 원고 전이면 비워둔다. */
  description?: string[];
  coverImage?: string;
  /** 대표사진 초점(object-position) — 기본 "50% 50%" */
  coverPosition?: string;
  images?: string[];
  tags?: string[];
  address?: string;
  hours?: string;
  mapUrl?: string;
  instagram?: string;
  website?: string;
  /**
   * 실제 GONGGANCUBE가 설치된 공간인지. true여도 홈페이지에서는 "Cube가 있다"는 안내만 하고,
   * Cube에서만 열리는 이야기(Episode/Scene)로는 절대 연결하지 않는다.
   */
  cubeAvailable: boolean;
}

export interface Curation {
  slug: string;
  /** 표시 번호 — "CURATION 001" */
  number: number;
  region: string;
  title: string;
  summary: string;
  cover: ImageRef;
  /** 선정 공간(홈페이지 SPACE slug, 순서대로) */
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
  /** 이 사람이 머문 공간(홈페이지 SPACE slug, 선택) */
  spaceSlugs: string[];
  blocks: ContentBlock[];
  publishedAt: string;
}
