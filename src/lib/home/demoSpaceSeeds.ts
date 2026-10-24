/* ── 시연용 가상 공간 11곳의 원본 데이터 ─────────────────────────────────────────
   ⚠ 실제 공간이 아니다. 사진은 분위기 참고용(public/demo, EXIF 제거 · 1400px 이하)이고 이름 · 소개문은 지어낸 것이다.
   실제 상호 · 주소 · 운영시간 · 전화번호 · 지도 링크는 없다(위치 정보 준비 중). 지역 "망원동"은 시연용 분류이며 실제 소재지 주장이 아니다.
   이 파일은 DB에 넣을 입력이다 — scripts/seed-demo-spaces.ts가 EditorialSpace 행(isDemo=true, slug 접두어 "demo-", cubeAvailable=false, Cube · Episode ·
   방명록 없음)으로 만든다. 행이 생긴 뒤에는 일반 공간과 같은 저장 · 내 공간 · 추천 경로를 쓴다(isDemo + 접두어가 출처 표시 — src/lib/demoSpaces.ts).
   태그 · 유형은 관리자 태그 정본 이름만 쓴다. ── */

export interface DemoSpaceSeed {
  slug: string;
  name: string;
  area: string;
  category: string;
  tags: string[];
  summary: string;
  description: string[];
  /** public/ 아래 경로 */
  image: string;
}

export const DEMO_SPACE_SEEDS: DemoSpaceSeed[] = [
  {
    slug: "demo-window-afternoon", name: "창가의 오후", area: "망원동", category: "카페", tags: ["커피", "조용한", "음악", "혼자"], image: "/demo/window-afternoon.jpg",
    summary: "큰 창 앞에 앉아 낮은 볼륨의 음악을 듣는 카페.",
    description: ["천장에 설비가 그대로 드러난 밝은 실내에 나무 테이블과 가벼운 의자가 놓여 있다. 창가에는 바 형태의 자리가 길게 이어지고, 창 옆에는 스피커가 서 있다.", "대화보다 창밖을 보며 혼자 앉아 있는 사람이 어울리는 곳이다."],
  },
  {
    slug: "demo-notes-records", name: "쪽지와 음반", area: "망원동", category: "문화 카페", tags: ["음악", "책", "대화", "작은 공간"], image: "/demo/notes-and-records.jpg",
    summary: "방문자가 남긴 쪽지가 벽에 붙고 CD 진열대가 이어지는 작은 공간.",
    description: ["벽면의 철망에 손글씨 쪽지와 사진이 집게로 걸려 있고, 그 아래로 CD가 삼각 진열대에 꽂혀 있다.", "음반을 고르다 다른 사람의 글을 읽게 되는 구조여서, 혼자 가도 대화가 오가는 느낌이 든다."],
  },
  {
    slug: "demo-slide-room", name: "슬라이드 룸", area: "망원동", category: "복합문화공간", tags: ["전시", "독특한", "감각 있는", "작은 공간"], image: "/demo/slide-room.jpg",
    summary: "빛 아래 펼쳐 놓은 필름 슬라이드를 들여다보는 작은 전시 공간.",
    description: ["밝은 라이트 테이블 위에 오래된 컬러 슬라이드 필름이 흩어져 있다. 한 장씩 들어 올려 빛에 비춰 볼 수 있다.", "전시를 빠르게 훑기보다 한 장에 오래 머무는 사람에게 맞는 공간이다."],
  },
  {
    slug: "demo-water-window", name: "물가의 창", area: "망원동", category: "카페", tags: ["조용한", "편안한", "오래 머물기", "혼자"], image: "/demo/water-window.jpg",
    summary: "천장까지 닿는 창으로 물과 산이 보이는 넓은 홀.",
    description: ["높은 유리창 너머로 물과 능선이 이어지고, 낮은 의자와 테이블이 창을 향해 놓여 있다.", "실내가 어둡고 바깥이 밝아 창이 풍경처럼 보인다. 말수가 적은 방문에 어울린다."],
  },
  {
    slug: "demo-shelf-window", name: "서가 뒤의 창", area: "망원동", category: "북카페", tags: ["책", "집중되는", "조용한", "혼자"], image: "/demo/shelf-window.jpg",
    summary: "서가 사이로 햇빛이 들어오는 작업하기 좋은 북카페.",
    description: ["식물이 놓인 책장 너머로 블라인드가 반쯤 내려간 창이 이어진다. 테이블마다 독서등이 있고, 각자 자기 자리에서 책이나 노트를 펼친다.", "소리가 적어 한 가지 일에 집중하고 싶은 날에 맞는다."],
  },
  {
    slug: "demo-teacup-shelf", name: "찻잔 선반", area: "망원동", category: "문화 카페", tags: ["따뜻한", "소품", "대화", "오래 머물기"], image: "/demo/teacup-shelf.jpg",
    summary: "칸마다 다른 찻잔과 다기가 놓인 벽면 선반이 있는 찻집.",
    description: ["격자로 나뉜 나무 선반에 크기와 색이 다른 잔과 다기가 칸마다 놓여 있고, 잔마다 작은 이름표가 붙어 있다.", "마시고 싶은 잔을 고르는 일에서 대화가 시작된다. 둘이나 소수가 천천히 앉기 좋다."],
  },
  {
    slug: "demo-pen-postbox", name: "만년필과 우체통", area: "망원동", category: "복합문화공간", tags: ["소품", "책", "디자인", "작은 공간"], image: "/demo/pen-and-postbox.jpg",
    summary: "만년필과 잉크, 손글씨 엽서를 놓아 둔 작은 문구 책상.",
    description: ["책으로 지붕을 얹은 작은 나무 우체통과 액자 속 손글씨, 잉크병과 만년필 거치대가 한 테이블에 놓여 있다.", "쓰는 도구를 구경하고 직접 몇 줄 적어 볼 수 있는, 천천히 둘러보는 공간이다."],
  },
  {
    slug: "demo-jazz-shelf", name: "재즈 음반장", area: "망원동", category: "LP카페", tags: ["LP", "음악", "저녁", "편안한"], image: "/demo/jazz-record-shelf.jpg",
    summary: "벽 한 면을 채운 음반장 앞에서 저녁에 음악을 듣는 공간.",
    description: ["큰 격자 음반장에 LP가 세로로 빽빽하게 꽂혀 있고, 위쪽에는 연주하는 사람의 흑백 사진이 걸려 있다. 뒤쪽에는 바 선반이 보인다.", "조명이 낮아지는 저녁에 음악을 들으러 가기 좋다."],
  },
  {
    slug: "demo-paper-archive", name: "종이 아카이브", area: "망원동", category: "복합문화공간", tags: ["전시", "디자인", "감각 있는", "작은 공간"], image: "/demo/paper-wall.jpg",
    summary: "곡선 벽을 따라 종이 작업물이 층층이 놓인 전시 공간.",
    description: ["어두운 곡선 벽에 목재 선반이 이어지고, 선반마다 종이 봉투 형태의 작업물이 비스듬히 기대어 있다. 선반 위쪽의 간접 조명이 종이의 결을 드러낸다.", "한 점씩 가까이 보다가 벽을 따라 걷게 된다."],
  },
  {
    slug: "demo-camera-display", name: "구형 카메라 진열", area: "망원동", category: "촬영장비", tags: ["소품", "독특한", "전시", "다시 오고 싶은"], image: "/demo/camera-display.jpg",
    summary: "2000년대 디지털카메라와 오래된 시계를 모아 둔 작은 가게.",
    description: ["금속 선반 위에 컴팩트 카메라가 상자와 함께 놓여 있고, 위 선반에는 탁상시계가 줄지어 있다. 물건마다 작은 안내 판이 붙어 있다.", "쓰지 않게 된 물건들을 구경하는 재미로 들르게 된다."],
  },
  {
    slug: "demo-green-shelf", name: "초록 서가", area: "망원동", category: "북카페", tags: ["책", "따뜻한", "다시 오고 싶은", "대화"], image: "/demo/green-shelf.jpg",
    summary: "손글씨 추천 쪽지가 책마다 붙은 초록색 나무 서가.",
    description: ["초록색 나무 칸마다 책이 한 권씩 놓이고, 책 위나 옆에 손으로 쓴 추천 쪽지가 붙어 있다. 솔방울과 작은 타자기 소품이 칸을 채운다.", "쪽지를 읽고 책을 고르게 되어, 책 이야기를 나누고 싶은 사람과 가기 좋다."],
  },
];

/* ── 실제 Partner 6곳의 편집 태그(방문자에게 보이는 분류) ──────────────────────────────
   근거는 각 공간의 Episode · Scene 본문과 공간 유형뿐이다(운영자가 말한 것에서 읽히는 것만, 철학 · 특성을 지어내지 않는다).
   관리자 태그 정본 이름만 쓰고 3~5개, 공간마다 구성이 다르다. scripts/seed-demo-spaces.ts가 "태그가 비어 있는 공간에만" 채운다(덮어쓰지 않음). */
export const PARTNER_TAG_PLAN: Record<string, { tags: string[]; basis: string }> = {
  nokhwabutton: { tags: ["독특한", "대화", "영감 있는", "오래 머물기"], basis: "캠코더 대여 공간 · 공간과 대화에 대한 이야기 · 인터뷰 카드 · 기록을 보는 한 시간" },
  dasijeom: { tags: ["책", "조용한", "혼자", "영감 있는"], basis: "공유서재 · 조용히 사색하고 책을 보는 시간 · 나를 들여다보는 이야기" },
  "booknook-yeonnam": { tags: ["책", "조용한", "혼자", "편안한", "작은 공간"], basis: "독립서점 · 한 팀만을 위한 공간 · 꼭 책을 읽지 않아도 편안하게" },
  "aka-coffee-room": { tags: ["커피", "감각 있는", "다시 오고 싶은", "편안한"], basis: "카페 · 호텔 로비 · 위스키 바 · 지하철 카페의 세 가지 분위기 · 다시 오고 싶다는 손님의 말" },
  "turndown-service": { tags: ["LP", "음악", "대화", "편안한"], basis: "LP카페 · 하나를 고르라면 LP · 음악을 듣고 도란도란 이야기 · 편히 쉬다 가세요" },
  "inner-discovery": { tags: ["커피", "영감 있는", "독특한", "혼자"], basis: "복합문화공간 · 커피 한 잔 동안 나를 생각하는 시간 · 물로 경계를 나눠 비워 둔 공간" },
};
