/* ── 사이트 공통 설정(에디토리얼 홈) ──────────────────────────────────── */

export const BRAND_NAME = "GONGGANCUBE";
export const BRAND_MESSAGE = "공간의 이해, 사람과의 연결.";

export const CONTACT_EMAIL = "gonggancube@gmail.com";
export const INSTAGRAM_URL = "https://www.instagram.com/gonggancube/";

/**
 * 홈 EXPLORE SPACE에 노출할 홈페이지 SPACE(src/content/spaces.ts의 slug, 표시 순서).
 * /spaces 목록은 spaces.ts 전체를 보여준다. Cube 운영 DB와는 무관하다.
 */
export const FEATURED_SPACE_SLUGS = [
  "turndown-service",
  "booknook-yeonnam",
  "inner-discovery",
  "dasijeom",
  "nokhwabutton",
  "aka-coffee-room",
];

/** 홈 FEATURED CURATION — 다른 지역으로 교체할 때 이 값만 바꾼다(없으면 가장 최근 번호) */
export const FEATURED_CURATION_SLUG = "yeonnam-slow-alone";

/** 홈 HERO 사진으로 빌려 쓸 홈페이지 SPACE */
export const HERO_IMAGE_SPACE_SLUG = "aka-coffee-room";

/**
 * 홈 LATEST STORIES 피드 — PEOPLE/SPACE/CURATION을 섞어 매거진처럼 보여준다(위에서부터).
 * SPACE 항목의 headline이 없으면 홈페이지 SPACE의 summary를 쓴다.
 */
export type FeedItem =
  | { kind: "people"; slug: string }
  | { kind: "space"; slug: string; headline?: string }
  | { kind: "curation"; slug: string };

export const LATEST_FEED: FeedItem[] = [
  { kind: "people", slug: "people-001" },
  { kind: "space", slug: "turndown-service", headline: "음악을 들어봐주세요. 편히 쉬다가세요." },
  { kind: "space", slug: "booknook-yeonnam", headline: "나만의 작은 공간 하나" },
  { kind: "curation", slug: "mangwon-making" },
];

/* ── 참여(제안·제보·협업) — 1단계는 이메일(mailto)로 받는다.
   구글 폼 등으로 바꿀 때는 href만 교체하면 된다. ── */

function mailto(subject: string, body: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface ParticipationItem {
  key: "space" | "story" | "partnership";
  label: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

export const PARTICIPATION: ParticipationItem[] = [
  {
    key: "space",
    label: "SPACE",
    title: "공간 등록・협업 문의",
    description: "공간에 담긴 이야기를 공간큐브와 함께 기록해보세요. 문화공간, 카페, 서점, 작업실 등 다양한 공간의 제안을 기다립니다.",
    cta: "공간 제안하기",
    href: mailto("[공간 제안] ", "공간 이름:\n지역:\n공간 소개(자유롭게):\n운영자 성함:\n연락처:\n"),
  },
  {
    key: "story",
    label: "STORY",
    title: "사람・공간 제보",
    description: "소개하고 싶은 사람이나 공간이 있나요? 공간에 얽힌 이야기를 공간큐브에 들려주세요.",
    cta: "이야기 제보하기",
    href: mailto("[이야기 제보] ", "소개하고 싶은 사람 또는 공간:\n그 이야기(자유롭게):\n연락받을 방법(선택):\n"),
  },
  {
    key: "partnership",
    label: "PARTNERSHIP",
    title: "프로젝트・협업 문의",
    description: "브랜드, 전시, 행사, 지역 프로젝트 등 공간큐브와 함께할 다양한 제안을 기다립니다.",
    cta: "협업 문의하기",
    href: mailto("[협업 문의] ", "소속/이름:\n제안 내용:\n연락처:\n"),
  },
];

export const SUGGEST_SPACE_HREF = PARTICIPATION[0].href;
