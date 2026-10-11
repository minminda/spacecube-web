/* ── Discovery 구조 확인용 임시 공간(FIXTURE) ──────────────────────────────────
   ⚠ 실제 공간이 아니다. 운영 DB에 넣지 않고, 실제 공개 데이터처럼 보이게 쓰지 않는다.
   - 관리자 · 로컬 개발에서 ?preview=fixtures로 열 때만 HOME · 검색 · 지역 · 공간 상세(/spaces/fixture-N)에 섞인다.
     일반 방문자에게는 어떤 경우에도 내려가지 않는다(HOME: src/app/page.tsx · 검색: src/app/search/page.tsx,
     src/app/api/search/route.ts · 상세: src/app/spaces/[slug]/page.tsx 모두 관리자 · development 판정 뒤에만 부른다).
   - 이름은 "임시 ·"로 시작하게 해 임시임이 드러나게 하고, 사진은 넣지 않는다(EdImage 플레이스홀더).
   - slug는 fixture-N — 상세 페이지는 이 파일의 데이터로만 그린다(DB 조회 없음). 저장은 화면 안에서만 바뀐다.
   - 지역 5 × 유형 6 = 30곳. 태그는 관리자 태그 정본(조용한 · 책 · 음악 · LP …)과 같은 이름을 쓴다.
   실제 공간이 충분히 쌓이면 이 파일을 지운다. ── */

import type { HomeSpace } from "./shelves";
import type { SpaceView } from "@/lib/editorial/types";

export const FIXTURE_SLUG_PREFIX = "fixture-";

export interface FixtureSpace extends HomeSpace {
  fixture: true;
  /** 선정 이유(큐레이션 선정 이유 자리에 쓰인다) */
  reason: string;
  /** 지도 링크가 있는 공간인가(placeholder 주소 — 실제 지도가 아니다) */
  hasMapLink: boolean;
}

type Seed = { area: string; category: string; tags: string[]; label: string; summary: string; reason: string; partner?: boolean; map?: boolean };

const SEEDS: Seed[] = [
  // 후암
  { area: "후암", category: "카페", tags: ["커피", "조용한", "혼자", "오래 머물기"], label: "골목 카페", summary: "창가 자리에서 오래 앉아 있기 좋은 동네 카페.", reason: "혼자 와서 한참 머물다 가는 사람이 많은 곳", map: true },
  { area: "후암", category: "서점", tags: ["책", "조용한", "혼자"], label: "작은 서점", summary: "주인이 고른 책만 놓인 작은 서점.", reason: "한 권을 천천히 고르게 되는 곳", map: true },
  { area: "후암", category: "전시공간", tags: ["전시", "감각 있는", "산책 중 들르기"], label: "작은 전시 공간", summary: "골목 안쪽의 작은 전시 공간.", reason: "산책하다 들르기 좋은 전시", map: true },
  { area: "후암", category: "편집숍", tags: ["소품", "디자인", "감각 있는"], label: "소품 가게", summary: "손에 잡히는 작은 물건을 모은 가게.", reason: "취향이 선명한 선반 구성" },
  { area: "후암", category: "바", tags: ["음악", "LP", "저녁"], label: "LP 바", summary: "저녁이면 LP가 돌아가는 작은 바.", reason: "음악을 듣기 위해 가는 저녁", partner: true, map: true },
  { area: "후암", category: "문화공간", tags: ["대화", "편안한", "작은 공간"], label: "모임 공간", summary: "작은 모임이 열리는 문화공간.", reason: "대화가 자연스럽게 이어지는 곳" },
  // 망원
  { area: "망원", category: "카페", tags: ["커피", "대화", "편안한"], label: "로스터리 카페", summary: "직접 볶은 원두를 내리는 카페.", reason: "커피 이야기를 나누기 좋은 곳", map: true },
  { area: "망원", category: "서점", tags: ["책", "혼자", "오래 머물기"], label: "책방", summary: "앉아서 읽다 갈 수 있는 책방.", reason: "책을 사지 않아도 오래 앉게 되는 곳", partner: true, map: true },
  { area: "망원", category: "전시공간", tags: ["전시", "조용한", "작은 공간"], label: "사진 전시 공간", summary: "작은 사진 전시가 바뀌며 열리는 공간.", reason: "짧게 보고 나오기 좋은 전시" },
  { area: "망원", category: "편집숍", tags: ["소품", "LP", "음악"], label: "레코드 숍", summary: "중고 LP와 소품을 함께 파는 가게.", reason: "LP를 구경하러 들르는 가게", map: true },
  { area: "망원", category: "바", tags: ["저녁", "대화", "음악"], label: "동네 바", summary: "음악이 낮게 깔리는 동네 바.", reason: "저녁에 대화하기 좋은 분위기" },
  { area: "망원", category: "문화공간", tags: ["음악", "편안한", "감각 있는"], label: "공연 공간", summary: "작은 공연이 열리는 공간.", reason: "라이브를 가까이서 듣는 곳" },
  // 연남
  { area: "연남", category: "카페", tags: ["커피", "혼자", "조용한"], label: "조용한 카페", summary: "혼자 와서 앉아 있기 좋은 카페.", reason: "소음이 적어 혼자 머물기 좋은 곳", partner: true, map: true },
  { area: "연남", category: "서점", tags: ["책", "감각 있는", "대화"], label: "독립서점", summary: "독립출판물을 모은 서점.", reason: "책 이야기가 오가는 서점", map: true },
  { area: "연남", category: "전시공간", tags: ["전시", "디자인", "감각 있는"], label: "디자인 전시 공간", summary: "디자인 전시가 열리는 작은 공간.", reason: "보고 나면 이야기하고 싶어지는 전시" },
  { area: "연남", category: "편집숍", tags: ["소품", "디자인", "작은 공간"], label: "문구 가게", summary: "문구와 종이 제품을 모은 가게.", reason: "작은 물건을 천천히 구경하는 재미" },
  { area: "연남", category: "바", tags: ["저녁", "음악", "혼자"], label: "와인 바", summary: "혼자 가도 어색하지 않은 와인 바.", reason: "혼자 저녁을 보내기 좋은 곳", map: true },
  { area: "연남", category: "문화공간", tags: ["대화", "산책 중 들르기", "편안한"], label: "작은 상영관", summary: "독립영화를 상영하는 작은 공간.", reason: "영화를 보고 이야기를 나누기 좋은 곳" },
  // 서촌
  { area: "서촌", category: "카페", tags: ["커피", "대화", "오래 머물기"], label: "한옥 카페", summary: "한옥 마당이 보이는 카페.", reason: "마당을 보며 오래 앉아 있는 곳", map: true },
  { area: "서촌", category: "서점", tags: ["책", "조용한", "작은 공간"], label: "동네 서점", summary: "시와 에세이 위주의 서점.", reason: "조용히 한 줄씩 읽게 되는 곳" },
  { area: "서촌", category: "전시공간", tags: ["전시", "조용한", "혼자"], label: "갤러리", summary: "회화 전시가 열리는 갤러리.", reason: "혼자 천천히 보기 좋은 전시", partner: true, map: true },
  { area: "서촌", category: "편집숍", tags: ["소품", "감각 있는", "디자인"], label: "공예 숍", summary: "작가 공예품을 소개하는 가게.", reason: "공예 작가의 물건을 직접 만져 보는 곳" },
  { area: "서촌", category: "바", tags: ["저녁", "대화", "편안한"], label: "골목 바", summary: "골목 끝의 작은 바.", reason: "저녁 산책 끝에 들르기 좋은 곳" },
  { area: "서촌", category: "문화공간", tags: ["산책 중 들르기", "감각 있는", "작은 공간"], label: "복합 문화공간", summary: "작은 전시와 모임이 함께 있는 공간.", reason: "들를 때마다 다른 프로그램이 있는 곳" },
  // 성수
  { area: "성수", category: "카페", tags: ["커피", "감각 있는", "디자인"], label: "공장 카페", summary: "옛 공장을 고친 넓은 카페.", reason: "공간 자체가 볼거리인 카페", map: true },
  { area: "성수", category: "서점", tags: ["책", "디자인", "감각 있는"], label: "디자인 서점", summary: "디자인 책을 모은 서점.", reason: "디자인 책을 한자리에서 훑어보는 곳" },
  { area: "성수", category: "전시공간", tags: ["전시", "감각 있는", "루프탑"], label: "팝업 전시 공간", summary: "자주 바뀌는 전시와 팝업이 열리는 곳.", reason: "갈 때마다 다른 전시" },
  { area: "성수", category: "편집숍", tags: ["소품", "패션", "디자인"], label: "편집숍", summary: "패션과 소품을 함께 고른 가게.", reason: "고른 사람의 기준이 보이는 가게", map: true },
  { area: "성수", category: "바", tags: ["저녁", "루프탑", "대화"], label: "루프탑 바", summary: "해 질 무렵이 좋은 루프탑 바.", reason: "저녁 풍경을 보며 이야기하기 좋은 곳" },
  { area: "성수", category: "문화공간", tags: ["음악", "편안한", "예약제"], label: "청음 공간", summary: "예약하고 음악을 듣는 작은 공간.", reason: "음악에만 집중하는 한 시간" },
];

export function fixtureSlug(i: number): string {
  return `${FIXTURE_SLUG_PREFIX}${i + 1}`;
}

const fixtureOf = (s: Seed, i: number, order: number): FixtureSpace => ({
  id: `fixture:${i}`,
  slug: fixtureSlug(i),
  name: `임시 · ${s.area} ${s.label}`,
  area: s.area,
  category: s.category,
  tags: s.tags,
  summary: s.summary,
  image: { src: null, alt: "" },
  partner: !!s.partner,
  order,
  fixture: true,
  reason: s.reason,
  hasMapLink: !!s.map,
});

/** 임시 공간 목록 — 실제 공간 뒤에 붙도록 order를 큰 값부터 준다(새로 소개한 순 정렬에서 섞여 보이게) */
export function fixtureSpaces(startOrder: number): FixtureSpace[] {
  return SEEDS.map((s, i) => fixtureOf(s, i, startOrder + i));
}

/** slug(fixture-N)로 임시 공간 하나 — 없으면 null */
export function findFixtureSpace(slug: string): FixtureSpace | null {
  if (!slug.startsWith(FIXTURE_SLUG_PREFIX)) return null;
  const i = Number(slug.slice(FIXTURE_SLUG_PREFIX.length)) - 1;
  return Number.isInteger(i) && SEEDS[i] ? fixtureOf(SEEDS[i], i, i + 1) : null;
}

/** 공간 상세 화면용 모양(공개 상세가 쓰는 SpaceView) — 지도 링크는 placeholder다 */
export function fixtureSpaceView(f: FixtureSpace): SpaceView {
  return {
    id: f.id,
    slug: f.slug as string,
    name: f.name,
    area: f.area ?? "",
    category: f.category,
    summary: f.summary,
    description: ["UI 확인용 임시 공간입니다. 실제 공간 정보가 아닙니다."],
    tags: f.tags,
    mapUrl: f.hasMapLink ? "https://example.com/fixture-map" : undefined,
    cubeAvailable: f.partner,
    status: "PUBLISHED",
  };
}

/** Partner 임시 공간의 EP.1 — QR 전 잠금 상태 UI 확인용 목업(DB의 Cube · Episode와 무관) */
export function fixtureEpisodes(f: FixtureSpace) {
  return {
    unlocked: false,
    episodes: f.partner ? [{ id: `${f.id}:ep1`, episodeNumber: 1, title: "임시 · 첫 번째 이야기", state: "LOCKED" as const }] : [],
  };
}

/** 임시 지역 — 지역 선택 목록에서 실제 데이터가 없는 지역도 선반이 생기는지 확인용 */
export function fixtureAreaCounts(): { area: string; spaceCount: number; curationCount: number }[] {
  const map = new Map<string, number>();
  for (const s of SEEDS) map.set(s.area, (map.get(s.area) ?? 0) + 1);
  return [...map].map(([area, spaceCount]) => ({ area, spaceCount, curationCount: 0 }));
}
