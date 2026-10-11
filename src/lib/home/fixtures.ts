/* ── HOME 선반 UI 확인용 임시 공간(FIXTURE) ─────────────────────────────────────
   ⚠ 실제 공간이 아니다. 운영 DB에 넣지 않고, 실제 공개 데이터처럼 보이게 쓰지 않는다.
   - HOME을 관리자 · 로컬 개발에서 `/?preview=fixtures`로 열 때만 실제 공간 사이에 섞여 선반 구조(지역 · 테마 · 가로 스크롤)를 확인하게 한다.
     운영의 일반 방문자는 이 데이터를 절대 보지 않는다(src/app/EditorialHome.tsx의 fixtures 판정).
   - 이름 · 한 줄은 "임시"임이 드러나게 쓰고, 사진은 넣지 않는다(EdImage 플레이스홀더로 보인다).
   - 상세 페이지가 없으므로 slug는 null — 카드는 링크가 아니다.
   실제 Space ↔ Region/Theme 데이터 구조가 생기면 이 파일을 지운다. ── */

import type { HomeSpace } from "./shelves";

type Seed = { area: string; category: string; tags: string[]; label: string };

const SEEDS: Seed[] = [
  { area: "후암", category: "카페", tags: ["음악", "LP", "혼자"], label: "음악 카페" },
  { area: "후암", category: "독립서점", tags: ["책", "조용"], label: "작은 서점" },
  { area: "후암", category: "카페", tags: ["커피", "대화"], label: "동네 카페" },
  { area: "후암", category: "갤러리", tags: ["전시"], label: "작은 전시 공간" },
  { area: "후암", category: "바", tags: ["저녁", "음악"], label: "저녁 바" },
  { area: "망원", category: "카페", tags: ["커피", "로스터리"], label: "로스터리" },
  { area: "망원", category: "레코드숍", tags: ["음악", "LP"], label: "레코드 숍" },
  { area: "망원", category: "편집숍", tags: ["소품", "숍"], label: "작은 편집숍" },
  { area: "망원", category: "독립서점", tags: ["책", "혼자"], label: "책방" },
  { area: "연남", category: "카페", tags: ["커피", "혼자"], label: "조용한 카페" },
  { area: "연남", category: "독립서점", tags: ["책"], label: "서점" },
  { area: "연남", category: "소극장", tags: ["영화", "저녁"], label: "작은 상영관" },
  { area: "연남", category: "문구점", tags: ["숍", "문구"], label: "문구 가게" },
  { area: "서촌", category: "갤러리", tags: ["전시", "혼자"], label: "갤러리" },
  { area: "서촌", category: "카페", tags: ["커피", "대화"], label: "골목 카페" },
  { area: "서촌", category: "시네마", tags: ["영화"], label: "작은 영화관" },
];

/** 임시 공간 목록 — 실제 공간 뒤에 붙도록 order를 큰 값부터 준다(새로 소개한 순 정렬에서 섞여 보이게) */
export function fixtureSpaces(startOrder: number): HomeSpace[] {
  return SEEDS.map((s, i) => ({
    id: `fixture:${i}`,
    slug: null,
    name: `임시 · ${s.area} ${s.label}`,
    area: s.area,
    category: s.category,
    tags: s.tags,
    summary: "UI 확인용 임시 카드입니다. 실제 공간 정보가 아닙니다.",
    image: { src: null, alt: "" },
    partner: false,
    order: startOrder + i,
    fixture: true,
  }));
}

/** 임시 지역 — 지역 선택 목록에서 실제 데이터가 없는 지역도 선반이 생기는지 확인용 */
export function fixtureAreaCounts(): { area: string; spaceCount: number; curationCount: number }[] {
  const map = new Map<string, number>();
  for (const s of SEEDS) map.set(s.area, (map.get(s.area) ?? 0) + 1);
  return [...map].map(([area, spaceCount]) => ({ area, spaceCount, curationCount: 0 }));
}
