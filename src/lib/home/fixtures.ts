/* ── Discovery 구조 확인용 임시 공간(FIXTURE) ──────────────────────────────────
   ⚠ 실제 공간이 아니다. 운영 DB에 넣지 않고, 실제 공개 데이터처럼 보이게 쓰지 않는다.
   - 관리자 · 로컬 개발에서 ?preview=fixtures로 열 때만 HOME · 검색 · 지역 · 공간 상세(/spaces/fixture-N)에 섞인다.
     일반 방문자에게는 어떤 경우에도 내려가지 않는다(HOME: src/app/page.tsx · 검색: src/app/search/page.tsx,
     src/app/api/search/route.ts · 상세: src/app/spaces/[slug]/page.tsx 모두 관리자 · development 판정 뒤에만 부른다).
   - 이름은 "임시 ·"로 시작하게 해 임시임이 드러나게 하고, 사진은 넣지 않는다(EdImage 플레이스홀더).
   - slug는 fixture-N — 상세 페이지는 이 파일의 데이터로만 그린다(DB 조회 없음). 저장은 화면 안에서만 바뀐다.
   - 지역 5 × 유형 6 = 30곳(글자만) + 사진 기반 가상 공간 11곳(DEMO_SEEDS, public/demo). 태그는 관리자 태그 정본(조용한 · 책 · 음악 · LP …)과 같은 이름을 쓴다.
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

/** name · image · description이 있으면 사진 기반 가상 공간(아래 DEMO_SEEDS) — 없으면 글자만 있는 임시 공간 */
type Seed = {
  area: string; category: string; tags: string[]; label: string; summary: string; reason: string; partner?: boolean; map?: boolean;
  name?: string;
  image?: string;
  description?: string[];
};

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

/* ── 사진 기반 가상 공간(시연용) ────────────────────────────────────────────
   ⚠ 실제 공간이 아니다. 사진은 분위기 참고용(public/demo/, EXIF 제거·1400px 이하)이고, 이름 · 소개문은 지어낸 것이다.
   실제 상호 · 주소 · 운영시간 · 전화번호는 없다(지도 링크도 없음). 사진 속 간판 · 포스터 · 앨범 표지가 뚜렷한 사진과 얼굴이 보이는 사진은 쓰지 않았다.
   지역은 시연용 분류(District 연남동 · 망원동 · 용인 처인구)일 뿐 소재지 주장이 아니다.
   태그 · 유형은 관리자 정본 이름만 쓴다. 위 SEEDS 뒤에 이어 붙여 slug(fixture-31~)가 기존 임시 공간과 겹치지 않는다. ── */
const DEMO_SEEDS: Seed[] = [
  {
    area: "망원", category: "카페", tags: ["커피", "조용한", "음악", "혼자"], label: "", name: "창가의 오후", image: "/demo/window-afternoon.jpg",
    summary: "큰 창 앞에 앉아 낮은 볼륨의 음악을 듣는 카페.",
    description: ["천장에 설비가 그대로 드러난 밝은 실내에 나무 테이블과 가벼운 의자가 놓여 있다. 창가에는 바 형태의 자리가 길게 이어지고, 창 옆에는 스피커가 서 있다.", "대화보다 창밖을 보며 혼자 앉아 있는 사람이 어울리는 곳이다."],
    reason: "창가 자리에서 음악을 들으며 혼자 오래 앉기 좋은 곳",
  },
  {
    area: "연남", category: "문화 카페", tags: ["음악", "책", "대화", "작은 공간"], label: "", name: "쪽지와 음반", image: "/demo/notes-and-records.jpg",
    summary: "방문자가 남긴 쪽지가 벽에 붙고 CD 진열대가 이어지는 작은 공간.",
    description: ["벽면의 철망에 손글씨 쪽지와 사진이 집게로 걸려 있고, 그 아래로 CD가 삼각 진열대에 꽂혀 있다.", "음반을 고르다 다른 사람의 글을 읽게 되는 구조여서, 혼자 가도 대화가 오가는 느낌이 든다."],
    reason: "음반을 고르다 다른 사람의 쪽지를 읽게 되는 곳",
  },
  {
    area: "연남", category: "복합문화공간", tags: ["전시", "독특한", "감각 있는", "작은 공간"], label: "", name: "슬라이드 룸", image: "/demo/slide-room.jpg",
    summary: "빛 아래 펼쳐 놓은 필름 슬라이드를 들여다보는 작은 전시 공간.",
    description: ["밝은 라이트 테이블 위에 오래된 컬러 슬라이드 필름이 흩어져 있다. 한 장씩 들어 올려 빛에 비춰 볼 수 있다.", "전시를 빠르게 훑기보다 한 장에 오래 머무는 사람에게 맞는 공간이다."],
    reason: "한 장씩 빛에 비춰 보며 오래 머물게 되는 전시",
  },
  {
    area: "용인 처인구", category: "카페", tags: ["조용한", "편안한", "오래 머물기", "혼자"], label: "", name: "물가의 창", image: "/demo/water-window.jpg",
    summary: "천장까지 닿는 창으로 물과 산이 보이는 넓은 홀.",
    description: ["높은 유리창 너머로 물과 능선이 이어지고, 낮은 의자와 테이블이 창을 향해 놓여 있다.", "실내가 어둡고 바깥이 밝아 창이 풍경처럼 보인다. 말수가 적은 방문에 어울린다."],
    reason: "창밖 풍경을 보며 말없이 오래 앉아 있기 좋은 곳",
  },
  {
    area: "망원", category: "북카페", tags: ["책", "집중되는", "조용한", "혼자"], label: "", name: "서가 뒤의 창", image: "/demo/shelf-window.jpg",
    summary: "서가 사이로 햇빛이 들어오는 작업하기 좋은 북카페.",
    description: ["식물이 놓인 책장 너머로 블라인드가 반쯤 내려간 창이 이어진다. 테이블마다 독서등이 있고, 각자 자기 자리에서 책이나 노트를 펼친다.", "소리가 적어 한 가지 일에 집중하고 싶은 날에 맞는다."],
    reason: "서가 너머 창가 자리에서 한 가지에 집중하기 좋은 곳",
  },
  {
    area: "연남", category: "문화 카페", tags: ["따뜻한", "소품", "대화", "오래 머물기"], label: "", name: "찻잔 선반", image: "/demo/teacup-shelf.jpg",
    summary: "칸마다 다른 찻잔과 다기가 놓인 벽면 선반이 있는 찻집.",
    description: ["격자로 나뉜 나무 선반에 크기와 색이 다른 잔과 다기가 칸마다 놓여 있고, 잔마다 작은 이름표가 붙어 있다.", "마시고 싶은 잔을 고르는 일에서 대화가 시작된다. 둘이나 소수가 천천히 앉기 좋다."],
    reason: "잔을 고르는 것부터 대화가 시작되는 찻집",
  },
  {
    area: "연남", category: "복합문화공간", tags: ["소품", "책", "디자인", "작은 공간"], label: "", name: "만년필과 우체통", image: "/demo/pen-and-postbox.jpg",
    summary: "만년필과 잉크, 손글씨 엽서를 놓아 둔 작은 문구 책상.",
    description: ["책으로 지붕을 얹은 작은 나무 우체통과 액자 속 손글씨, 잉크병과 만년필 거치대가 한 테이블에 놓여 있다.", "쓰는 도구를 구경하고 직접 몇 줄 적어 볼 수 있는, 천천히 둘러보는 공간이다."],
    reason: "쓰는 도구를 구경하며 천천히 둘러보는 작은 책상",
  },
  {
    area: "망원", category: "LP카페", tags: ["LP", "음악", "저녁", "편안한"], label: "", name: "재즈 음반장", image: "/demo/jazz-record-shelf.jpg",
    summary: "벽 한 면을 채운 음반장 앞에서 저녁에 음악을 듣는 공간.",
    description: ["큰 격자 음반장에 LP가 세로로 빽빽하게 꽂혀 있고, 위쪽에는 연주하는 사람의 흑백 사진이 걸려 있다. 뒤쪽에는 바 선반이 보인다.", "조명이 낮아지는 저녁에 음악을 들으러 가기 좋다."],
    reason: "저녁에 음반장 앞에서 음악을 듣기 좋은 곳",
  },
  {
    area: "망원", category: "복합문화공간", tags: ["전시", "디자인", "감각 있는", "작은 공간"], label: "", name: "종이 아카이브", image: "/demo/paper-wall.jpg",
    summary: "곡선 벽을 따라 종이 작업물이 층층이 놓인 전시 공간.",
    description: ["어두운 곡선 벽에 목재 선반이 이어지고, 선반마다 종이 봉투 형태의 작업물이 비스듬히 기대어 있다. 선반 위쪽의 간접 조명이 종이의 결을 드러낸다.", "한 점씩 가까이 보다가 벽을 따라 걷게 된다."],
    reason: "벽을 따라 걸으며 한 점씩 가까이 보는 전시",
  },
  {
    area: "망원", category: "촬영장비", tags: ["소품", "독특한", "전시", "다시 오고 싶은"], label: "", name: "구형 카메라 진열", image: "/demo/camera-display.jpg",
    summary: "2000년대 디지털카메라와 오래된 시계를 모아 둔 작은 가게.",
    description: ["금속 선반 위에 컴팩트 카메라가 상자와 함께 놓여 있고, 위 선반에는 탁상시계가 줄지어 있다. 물건마다 작은 안내 판이 붙어 있다.", "쓰지 않게 된 물건들을 구경하는 재미로 들르게 된다."],
    reason: "쓰지 않게 된 물건을 구경하는 재미로 들르는 가게",
  },
  {
    area: "연남", category: "북카페", tags: ["책", "따뜻한", "다시 오고 싶은", "대화"], label: "", name: "초록 서가", image: "/demo/green-shelf.jpg",
    summary: "손글씨 추천 쪽지가 책마다 붙은 초록색 나무 서가.",
    description: ["초록색 나무 칸마다 책이 한 권씩 놓이고, 책 위나 옆에 손으로 쓴 추천 쪽지가 붙어 있다. 솔방울과 작은 타자기 소품이 칸을 채운다.", "쪽지를 읽고 책을 고르게 되어, 책 이야기를 나누고 싶은 사람과 가기 좋다."],
    reason: "손글씨 추천을 읽고 책을 고르게 되는 서가",
  },
];

SEEDS.push(...DEMO_SEEDS);

export function fixtureSlug(i: number): string {
  return `${FIXTURE_SLUG_PREFIX}${i + 1}`;
}

const fixtureOf = (s: Seed, i: number, order: number): FixtureSpace => ({
  id: `fixture:${i}`,
  slug: fixtureSlug(i),
  name: s.name ?? `임시 · ${s.area} ${s.label}`,
  area: s.area,
  category: s.category,
  tags: s.tags,
  summary: s.summary,
  image: s.image ? { src: s.image, alt: s.name ?? "" } : { src: null, alt: "" },
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

/** 사진 기반 가상 공간만(시연용, 일반 방문자에게도 공개 가능 — ENABLE_PUBLIC_DEMO_SPACES). slug 번호는 SEEDS 순서 그대로다. */
export function demoSpaces(startOrder: number): FixtureSpace[] {
  return SEEDS.map((s, i) => (s.image ? fixtureOf(s, i, startOrder + i) : null)).filter((f): f is FixtureSpace => f !== null);
}

/** slug(fixture-N)로 임시 공간 하나 — 없으면 null. publicOnly면 사진 기반 가상 공간만(글자만 있는 임시 공간은 null). */
export function findFixtureSpace(slug: string, opts: { publicOnly?: boolean } = {}): FixtureSpace | null {
  if (!slug.startsWith(FIXTURE_SLUG_PREFIX)) return null;
  const i = Number(slug.slice(FIXTURE_SLUG_PREFIX.length)) - 1;
  if (!Number.isInteger(i) || !SEEDS[i]) return null;
  if (opts.publicOnly && !SEEDS[i].image) return null;
  return fixtureOf(SEEDS[i], i, i + 1);
}

const seedOf = (f: FixtureSpace): Seed | undefined => SEEDS[Number((f.slug ?? "").slice(FIXTURE_SLUG_PREFIX.length)) - 1];

/** 공간 상세 화면용 모양(공개 상세가 쓰는 SpaceView) — 지도 링크는 placeholder다 */
export function fixtureSpaceView(f: FixtureSpace): SpaceView {
  return {
    id: f.id,
    slug: f.slug as string,
    name: f.name,
    area: f.area ?? "",
    category: f.category,
    summary: f.summary,
    description: seedOf(f)?.description ?? ["UI 확인용 임시 공간입니다. 실제 공간 정보가 아닙니다."],
    coverImage: f.image.src ?? undefined,
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
export function fixtureAreaCounts(onlyPhoto = false): { area: string; spaceCount: number; curationCount: number }[] {
  const map = new Map<string, number>();
  for (const s of SEEDS) if (!onlyPhoto || s.image) map.set(s.area, (map.get(s.area) ?? 0) + 1);
  return [...map].map(([area, spaceCount]) => ({ area, spaceCount, curationCount: 0 }));
}
