import type { Person } from "./types";

/* ── PEOPLE 정적 데이터 ──────────────────────────────────────────────────
   공간을 통해 한 사람을 알아가는 콘텐츠. 현재는 형식 검증용 임시 항목 하나뿐이다 —
   실존 인물의 이야기를 지어내지 않도록 subject/사진을 비워 두었다. 실제 인터뷰 원고가
   나오면 이 항목을 교체하거나 앞에 추가한다. ── */

export const PEOPLE: Person[] = [
  {
    slug: "people-001",
    number: 1,
    title: "한 사람을 이해하기 위해 그 사람이 머문 공간을 따라갑니다",
    summary: "카페, 집, 골목, 학교, 작업실 — 한 사람에게 의미 있는 장소를 통해 그 사람을 알아가는 이야기.",
    spaceSlugs: [],
    publishedAt: "2026-09-30",
    blocks: [
      {
        type: "TEXT",
        text: "PEOPLE은 유명한 사람의 인터뷰가 아닙니다. 한 사람이 자주 머무는 곳, 기억이 남아 있는 곳, 지금의 자신을 만든 장소를 함께 걸으며 그 사람을 조금 더 이해해 보는 기록입니다.",
      },
      {
        type: "QNA",
        items: [
          { q: "요즘 가장 자주 머무는 공간은 어디인가요?", a: "첫 번째 PEOPLE 이야기를 준비하고 있습니다." },
          { q: "그 공간에서 주로 무엇을 하나요?", a: "—" },
        ],
      },
      { type: "CAPTION", text: "첫 번째 이야기를 준비하고 있습니다." },
    ],
  },
];

export function getPeople(): Person[] {
  return [...PEOPLE].sort((a, b) => b.number - a.number);
}

export function getPerson(slug: string): Person | undefined {
  return PEOPLE.find((p) => p.slug === slug);
}

export function formatPeopleNumber(n: number): string {
  return `PEOPLE ${String(n).padStart(3, "0")}`;
}
