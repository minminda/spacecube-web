/* ── 시연 컬렉션 확장 공간 — 원본 데이터는 이미 DB에 있는 운영 Space 행(비활성 · isDemo) ──────────────────
   2026-10-24. HOME이 한 컬렉션(17곳)만 반복해 보여 주던 문제를 줄이기 위해, 이미 DB에 사람이 입력해 둔 망원 공간 9곳을
   EditorialSpace(공개 상세) 행으로 "더한다". 새 사진을 올리거나 소개문을 쓰지 않는다 — 이름 · 주소 · 운영시간 · 지도 링크 · 한 줄 소개 · 소개문 · 대표 사진은
   운영 Space(srcSlug) 값을 그대로 복사한다(소개문이 "안녕하세요 …입니다" 같은 인사말이면 소개문은 비운다).
   ⚠ Partner가 아니다(cubeAvailable=false · QR · Episode · 방명록 없음 · 운영 Space는 비활성 그대로). 실제 장소이므로 "가상 공간"이라고 쓰지 않고
   카드에는 "시연 컬렉션"으로 표시한다(src/lib/demoSpaces.ts demoBadge).
   출처 표시: EditorialSpace.isDemo=true + slug 접두어 "demo-ext-". 지역은 주소 기준(시도플레이스만 서대문구 연희동)이며 망원 컬렉션 소속은 코드의 시연 지역 모드가 정한다.
   제외: 별관(사진에 제3자 워터마크), 뮤직컴플렉스(종로 인사동), 라이팅룸(중구 · 소개문이 인사말뿐). 태그는 관리자 태그 정본 이름만 쓰며
   근거는 운영 Space의 소개문 · 한 줄 소개에 적힌 것과 사진에서 보이는 것뿐이다. scripts/seed-extended-spaces.ts가 적용 · 보관 · 삭제를 맡는다. ── */

export interface ExtendedSpacePlan {
  /** 원본 운영 Space slug */
  srcSlug: string;
  /** 새 EditorialSpace slug — 접두어 demo-ext- */
  slug: string;
  area: string;
  category: string;
  tags: string[];
  basis: string;
}

export const EXTENDED_SPACE_PLAN: ExtendedSpacePlan[] = [
  { srcSlug: "tail-tango", slug: "demo-ext-tail-tango", area: "망원동", category: "독립서점", tags: ["책", "영감 있는", "독특한", "대화"], basis: "인권 · 장애 · 돌봄 책 소개와 문화 프로그램 운영" },
  { srcSlug: "silo-store", slug: "demo-ext-silo-store", area: "망원동", category: "소품샵", tags: ["소품", "독특한", "감각 있는", "영감 있는"], basis: "괘종시계 · 램프가 있는 빈티지 소품샵" },
  { srcSlug: "terrific_jam", slug: "demo-ext-terrific-jam", area: "망원동", category: "소품샵", tags: ["LP", "음악", "패션", "감각 있는"], basis: "LP 레코드와 의류를 함께 선보이는 셀렉숍" },
  { srcSlug: "cafe-gori", slug: "demo-ext-gori", area: "망원동", category: "문화 카페", tags: ["음악", "책", "편안한", "따뜻한"], basis: "잔잔한 음악과 책이 있는 동네 사랑방" },
  { srcSlug: "siiiidoplace", slug: "demo-ext-sido-place", area: "연희동", category: "복합문화공간", tags: ["대화", "독특한", "감각 있는"], basis: "취향이 맞는 사람들을 만나는 복합문화공간(한 줄 소개)" },
  { srcSlug: "denmark-library", slug: "demo-ext-denmark-library", area: "망원동", category: "독립서점", tags: ["책", "편안한", "집중되는", "혼자"], basis: "휴식과 몰입을 위한 공유 서재" },
  { srcSlug: "cutthekake_", slug: "demo-ext-cut-the-cake", area: "망원동", category: "전시공간", tags: ["전시", "영감 있는", "독특한", "편안한"], basis: "동시대 작가를 소개하는 독립 전시 공간" },
  { srcSlug: "goose-coffee-and-bar", slug: "demo-ext-goose-coffee-bar", area: "망원동", category: "복합문화공간", tags: ["음악", "책", "저녁", "따뜻한"], basis: "낮의 햇살과 밤의 재즈, 책과 음악이 공존하는 카페 · 바" },
  { srcSlug: "brown-front-door", slug: "demo-ext-brown-front-door", area: "망원동", category: "문화 카페", tags: ["커피", "음악", "감각 있는", "편안한"], basis: "에스프레소와 감각적인 인테리어의 문화 카페" },
];

/** 인사말뿐인 소개문은 소개로 쓰지 않는다 */
export function usableDescription(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (t.length < 30 || /^안녕하세요/.test(t)) return null;
  return t;
}
