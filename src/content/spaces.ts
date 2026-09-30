import type { EditorialSpace, ImageRef } from "./types";

/* ── 홈페이지 SPACE 정적 데이터 ──────────────────────────────────────────
   공간큐브가 발견하고 기록한 실제 공간의 공개 정보. Cube 운영 DB(Space)와 연결하지 않는다 —
   값이 같아 보여도 여기서 따로 관리한다(한쪽을 고쳐도 다른 쪽에 반영되지 않음).

   초기 6곳은 현재 Cube가 설치된 공간의 공개 정보(이름·지역·종류·주소·지도 링크·대표사진)를
   옮겨 적은 것이다. 공간 소개(description)는 확인된 원고가 없어 비워 두었다 — 실제 조사/원고가
   나오면 채운다. 새 지역(예: 문래 8곳)을 조사하면 여기에 cubeAvailable: false로 추가한다. ── */

export const SPACES: EditorialSpace[] = [
  {
    slug: "turndown-service",
    name: "턴다운서비스",
    area: "연남동",
    category: "LP카페",
    summary: "음악을 들어봐주세요. 편히 쉬다가세요.",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787550667/rmjcx9x8wofg1tsxol0g.jpg",
    address: "서울 마포구 동교로50길 7 반지층",
    mapUrl: "https://naver.me/GbDFJ5AE",
    cubeAvailable: true,
  },
  {
    slug: "booknook-yeonnam",
    name: "북눅 연남",
    area: "연남동",
    category: "독립서점",
    summary: "나만의 작은 공간 하나",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787028053/ueaomui9dbawrejjvhwk.jpg",
    address: "서울 마포구 월드컵북로6길 93 2층 203호(2.5층)",
    mapUrl: "https://naver.me/5Q37TZjo",
    cubeAvailable: true,
  },
  {
    slug: "inner-discovery",
    name: "내면의 발견",
    area: "연남동",
    category: "복합문화공간",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787549251/lcde2s2o2falistdvtlk.jpg",
    address: "서울 마포구 월드컵북로5길 53",
    mapUrl: "https://naver.me/xmxMKQzj",
    cubeAvailable: true,
  },
  {
    slug: "dasijeom",
    name: "다시점",
    area: "망원동",
    category: "복합문화공간",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787651338/c8l0vvqi6qbmkaqfifkc.jpg",
    address: "서울 마포구 월드컵로29길 51 3층",
    mapUrl: "https://naver.me/5as8TmvV",
    cubeAvailable: true,
  },
  {
    slug: "nokhwabutton",
    name: "녹화버튼",
    area: "망원동",
    category: "촬영장비",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787817293/j67iasptbdir89k3qoah.jpg",
    address: "서울 마포구 희우정로20길 22-13 1층 101호",
    mapUrl: "https://naver.me/FG7iUsLH",
    cubeAvailable: true,
  },
  {
    slug: "aka-coffee-room",
    name: "아카커피룸",
    area: "용인 처인구",
    category: "카페",
    coverImage: "https://res.cloudinary.com/dc1fh9hzl/image/upload/v1787642565/kvhrpngliaytuasuhul3.jpg",
    address: "경기 용인시 처인구 명지로 5 2층",
    mapUrl: "https://map.naver.com/p/entry/place/2017091536",
    cubeAvailable: true,
  },
];

const BY_SLUG = new Map(SPACES.map((s) => [s.slug, s]));

export function getSpace(slug: string): EditorialSpace | undefined {
  return BY_SLUG.get(slug);
}

/** slug 목록 순서대로 공간을 돌려준다(없는 slug는 건너뜀). */
export function getSpacesBySlugs(slugs: string[]): EditorialSpace[] {
  return slugs.flatMap((s) => BY_SLUG.get(s) ?? []);
}

export function spaceHref(slug: string): string {
  return `/spaces/${slug}`;
}

export interface ResolvedImage {
  src: string | null;
  alt: string;
  caption?: string;
  position?: string;
}

/** ImageRef → 실제 이미지 URL(없으면 src:null → 플레이스홀더로 렌더). */
export function resolveImage(ref: ImageRef | undefined): ResolvedImage {
  if (!ref) return { src: null, alt: "" };
  if (ref.src) return { src: ref.src, alt: ref.alt, caption: ref.caption };
  const space = ref.spaceSlug ? BY_SLUG.get(ref.spaceSlug) : undefined;
  return { src: space?.coverImage ?? null, alt: ref.alt, caption: ref.caption, position: space?.coverPosition };
}

export function spaceCoverImage(space: EditorialSpace): ResolvedImage {
  return { src: space.coverImage ?? null, alt: space.name, position: space.coverPosition };
}
