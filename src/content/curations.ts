import type { Curation } from "./types";

/* ── CURATION 정적 데이터 ────────────────────────────────────────────────
   지역 × 하나의 관점. 선정 공간은 홈페이지 SPACE(src/content/spaces.ts)의 slug로 참조하고,
   공간을 누르면 공개 SPACE 상세(/spaces/[slug])로만 이동한다. 본문 원고는 임시 초안이다 — 공간에 대한 사실(역사·메뉴·운영자 발언 등)은 쓰지
   않았고, 실제 원고가 나오면 blocks만 교체하면 된다. 목록은 number 내림차순,
   홈 FEATURED CURATION은 src/content/site.ts의 FEATURED_CURATION_SLUG. ── */

export const CURATIONS: Curation[] = [
  {
    slug: "yeonnam-slow-alone",
    number: 1,
    region: "연남",
    title: "혼자 천천히 머물기 좋은 공간들",
    summary: "음악, 책, 그리고 나 자신에게 조금 더 오래 머무를 수 있는 연남의 공간을 모았습니다.",
    cover: { spaceSlug: "inner-discovery", alt: "내면의 발견" },
    spaceSlugs: ["turndown-service", "booknook-yeonnam", "inner-discovery"],
    publishedAt: "2026-09-30",
    blocks: [
      { type: "HEADING", text: "빠르게 지나가는 동네에서, 천천히 머무는 법" },
      {
        type: "TEXT",
        text: "연남은 늘 사람이 많은 동네입니다. 그래서 오히려, 혼자 조용히 앉아 있을 수 있는 자리가 더 귀하게 느껴집니다.",
      },
      {
        type: "TEXT",
        text: "이번 큐레이션은 '무엇을 파는가'보다 '어떻게 머물게 하는가'를 기준으로 골랐습니다. 음악을 듣는 자리, 책 사이의 작은 구석, 나를 들여다보게 하는 공간까지 — 각자의 방식으로 시간을 느리게 만드는 곳들입니다.",
      },
      { type: "QUOTE", text: "공간을 알면, 머무는 시간이 달라집니다." },
      { type: "DIVIDER" },
      { type: "HEADING", text: "이번에 담은 공간" },
      { type: "SPACE_CARD", spaceSlug: "turndown-service" },
      { type: "SPACE_CARD", spaceSlug: "booknook-yeonnam" },
      { type: "SPACE_CARD", spaceSlug: "inner-discovery" },
      { type: "CAPTION", text: "각 공간의 더 깊은 이야기는 공간에 놓인 큐브의 QR을 통해 열립니다." },
    ],
  },
  {
    slug: "mangwon-making",
    number: 2,
    region: "망원",
    title: "무언가를 만드는 사람들의 동네",
    summary: "기록하고, 모이고, 새로운 것을 시도하는 사람들이 머무는 망원의 공간.",
    cover: { spaceSlug: "dasijeom", alt: "다시점" },
    spaceSlugs: ["dasijeom", "nokhwabutton"],
    publishedAt: "2026-09-30",
    blocks: [
      {
        type: "TEXT",
        text: "망원에는 무언가를 만드는 사람들이 모이는 공간이 있습니다. 결과물보다 그 과정을 함께 나누는 곳들을 따라가 봅니다.",
      },
      { type: "DIVIDER" },
      { type: "HEADING", text: "이번에 담은 공간" },
      { type: "SPACE_CARD", spaceSlug: "dasijeom" },
      { type: "SPACE_CARD", spaceSlug: "nokhwabutton" },
      { type: "CAPTION", text: "각 공간의 더 깊은 이야기는 공간에 놓인 큐브의 QR을 통해 열립니다." },
    ],
  },
];

export function getCurations(): Curation[] {
  return [...CURATIONS].sort((a, b) => b.number - a.number);
}

export function getCuration(slug: string): Curation | undefined {
  return CURATIONS.find((c) => c.slug === slug);
}

export function formatCurationNumber(n: number): string {
  return `CURATION ${String(n).padStart(3, "0")}`;
}
