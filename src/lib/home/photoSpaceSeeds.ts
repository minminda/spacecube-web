/* ── 전시용 사진 공간 — 2026-11-01. 졸업전시 HOME을 풍부하게 보이려고, 받은 사진 한 장당 공간 하나를 등록한다. ──────────────
   ⚠ 이름은 사진의 분위기를 보고 전시용으로 붙인 임의의 이름이다. 실제 상호 · 위치 · 주소 · 운영자 정보가 아니며, 지어내지 않는다(주소 · 운영시간 · 링크 비움).
   그래서 slug 접두어는 "demo-photo-"(= 시연용 가상 공간): 상세에 "가상 공간이며 실제 장소가 아닙니다" 안내가 붙고, 카드에는 표시가 없다.
   Partner가 아니다(cubeAvailable=false · QR · Episode · 방명록 없음). 사진 5번(Music Complex Seoul 간판이 보이는 곳)은 이미 등록된 운영 Space "뮤직컴플렉스"와
   같은 사진이라 새 공간을 만들지 않고 그 운영 Space 정보로 demo-ext-music-complex를 더한다(scripts/seed-photo-spaces.ts).
   scripts/seed-photo-spaces.ts가 적용한다(같은 slug가 있으면 건너뜀 — 재실행 안전). ── */

export interface PhotoSpacePlan {
  /** 받은 사진 파일 번호(1~8) */
  photo: number;
  slug: string;
  name: string;
  area: string;
  category: string;
  tags: string[];
  /** 한 줄 소개 — 사진에 보이는 것만 */
  summary: string;
  /** CSS object-position(선택) */
  position?: string;
}

export const PHOTO_SPACE_PLAN: PhotoSpacePlan[] = [
  { photo: 1, slug: "demo-photo-quiet-vitrine", name: "고요한 진열장", area: "망원동", category: "전시공간", tags: ["전시", "영감 있는", "독특한", "조용한"], summary: "어두운 진열장 안에서 작품 하나가 천천히 보이는 전시 공간", position: "50% 55%" },
  { photo: 2, slug: "demo-photo-video-archive", name: "영상 아카이브 룸", area: "망원동", category: "전시공간", tags: ["전시", "영감 있는", "독특한", "집중되는"], summary: "모니터 속 오래된 영상을 한 편씩 보는 상영 공간", position: "50% 40%" },
  { photo: 3, slug: "demo-photo-small-lamp-shop", name: "작은 조명 가게", area: "망원동", category: "소품샵", tags: ["소품", "디자인", "감각 있는", "독특한"], summary: "선반마다 다른 조명이 켜져 있는 작은 가게", position: "50% 60%" },
  { photo: 4, slug: "demo-photo-window-study", name: "창가 서재", area: "망원동", category: "독립서점", tags: ["책", "조용한", "편안한", "집중되는"], summary: "나무 서가 한가운데 작은 창으로 빛이 드는 서재", position: "50% 50%" },
  { photo: 6, slug: "demo-photo-drip-tools", name: "드립 도구 상점", area: "망원동", category: "소품샵", tags: ["커피", "소품", "따뜻한", "감각 있는"], summary: "드립백과 커피 도구가 선반에 가득한 작은 상점", position: "50% 45%" },
  { photo: 7, slug: "demo-photo-listening-nook", name: "작은 청음실", area: "망원동", category: "음악 바", tags: ["음악", "LP", "조용한", "작은 공간"], summary: "나무 벤치와 헤드폰이 놓인 작은 청음 공간", position: "50% 50%" },
  { photo: 8, slug: "demo-photo-crt-window", name: "브라운관이 있는 창가", area: "망원동", category: "복합문화공간", tags: ["독특한", "영감 있는", "작은 공간", "조용한"], summary: "창가에 놓인 오래된 브라운관 TV가 있는 방", position: "50% 55%" },
];

/** 이미 등록된 운영 Space(사진 5번과 같은 곳)를 시연 컬렉션 확장 공간으로 더하는 계획 — extendedSpaceSeeds와 같은 방식 */
export const MUSIC_COMPLEX_PLAN = {
  srcName: "뮤직컴플렉스",
  slug: "demo-ext-music-complex",
  area: "인사동",
  category: "음악 바",
  tags: ["음악", "LP", "감각 있는", "편안한"],
  basis: "LP로만 음악을 재생하는 작은 바(운영 Space 소개문)",
};
