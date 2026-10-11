# Claude Code Latest Handoff

Updated: 2026-10-11 (Discovery UI 다듬기 + 데스크톱 상세 창) · 신규 기능·DB·KPI·추천·태그·지역 데이터 변경 없음

## UI
- **모서리**: 토큰 `--ed-radius: 6px`(컨트롤·이미지) / `--ed-radius-lg: 10px`(창·시트) — `globals.css :root`. EdImage(카드·상세·플레이스홀더), `.ed-btn`, 지역 버튼·시트·검색창, 검색/필터 입력·드롭다운, 저장 아이콘 면, 선반 화살표, 세그먼트 탭, LATEST 이미지에 적용. 캡슐/원형 없음.
- **구분선**: LATEST 아래 검은 선·지역 입구 위 회색 선 제거(HOME에서 강한 horizontal divider는 이 둘뿐). 위계는 여백·타이포로.
- **간격**: 선반 상하 py 28/40→16/24px, 제목→카드 14/20→10/14, LATEST→지역 입구 축소, 카드 gap 10/20/24→8/14/16px(카드 폭 불변, 저장 터치 영역 40px 유지).
- **선반 제목**: 17/24px → 20/28px(Hero `ed-section-title` 32px보다 작게).
- **지역 버튼**: 테두리 fg→line, 선택=옅은 면+fg 테두리(검정 채움 제거), hover/active 면 변화, focus-visible 기존 outline.

## Space Detail
- **데스크톱(≥768px, 프로젝트 md)**: 앱 안 카드 클릭(`next/link` 소프트 이동) → `@modal` 병렬 라우트 + `(.)spaces/[slug]` 가로채기 → 뒤 화면 유지(스크롤·선반 위치 그대로) 위에 큰 창. 루트 `layout.tsx`에 `modal` 슬롯 추가, `@modal/default.tsx`·`[...catchAll]`(다른 경로로 가면 창 비움).
- **모바일**: 창 없음. 가로채기 페이지가 `sec-ch-ua-mobile`이면 데이터 조회 없이 빈 셸 → `SpaceDetailModal`이 좁은 폭을 감지해 같은 주소를 `location.reload()`로 독립 페이지로 로드. 상세 상단 우측 `X`(44px, `DetailCloseButton`): 앱 안에서 왔으면 `router.back()`, 아니면 HOME. 저장 아이콘(대표 이미지 우측 상단)과 분리, 하단 탭 표시 유지.
- **URL/뒤로가기**: 주소는 항상 `/spaces/[slug]`. 주소창·새 탭·새로고침은 독립 페이지(가로채기 안 탐). 뒤로가기=창 닫힘.
- **닫기**: X · 바깥 클릭(mousedown) · ESC 모두 `router.back()`. 패널 안 클릭은 안 닫힘.
- **접근성**: role=dialog aria-modal, 열릴 때 패널 포커스·닫으면 열었던 요소로 복귀, Tab 순환, body 스크롤 잠금(스크롤바 폭 보정), 닫기 aria-label, 창 내부 스크롤(overscroll contain).
- **컴포넌트 재사용**: 기존 `/spaces/[slug]` 본문을 `components/editorial/SpaceDetail.tsx`로 이동, `page.tsx`는 `<SpaceDetail presentation="page">`, 가로채기 페이지는 `presentation="modal">`. 본문 동일(저장·지도·Information·Episode/QR 잠금·이야기·인접 공간), 차이는 래퍼(`.editorial-bleed`+푸터 vs `.ed-modal-body`)와 닫기 UI뿐. 다크 토큰은 `.ed-modal-panel`에도 적용.

## 제거
- 상세 상단 `← {지역} 큐레이션` / `← 함께한 공간` 연결 링크 제거(`back` 계산 포함). 하단 "이 공간이 소개된 이야기"는 실제 에디토리얼 콘텐츠라 유지.

## 직접 확인 (localhost, 비로그인)
- 1440: 모달 열림(소프트 이동 유지)·ESC·바깥 클릭·X·브라우저 뒤로가기·패널 내부 클릭 무반응·body overflow 잠금/복원·포커스 패널 안·Partner(북눅 연남) Episode 블록·저장 버튼·지도 링크·가로 오버플로 없음.
- 375: 가로채기 건너뛰고 독립 페이지, 우측 상단 X(44px) 동작(/about으로 복귀), 저장 아이콘과 분리, 하단 탭 표시, 가로 오버플로 없음.
- 1920: HOME LATEST 아래 선 없음, 가로 오버플로 없음. 직접 `/spaces/booknook-yeonnam` = 독립 페이지.
- **못 한 것**: 이 환경에서 HOME/검색/지역 화면은 스트리밍 Suspense(`$RC` 미swap)로 하이드레이션 안 돼 실제 카드 클릭·선반 간격 시각 확인 불가(메모의 기존 환경 한계). 모달은 `next.router.push`로 검증, 선반 간격·제목 크기는 CSS 값으로만 확인. 로그인 상태·태블릿 폭(768~1023)·긴 공간명·이미지 없는 카드·로딩 상태는 직접 확인 못 함 — 사용자 확인 필요. 또한 `Navbar`/`BottomTabBar`는 창이 열린 동안 `usePathname`이 `/spaces/..`가 되어 활성 표시가 바뀔 수 있음(미확인).
- 다른 채팅이 3000에서 띄운 dev 서버가 `.next` 락을 잡고 있어 임시로 `distDir`를 바꿔 3100에서 검증 후 원복(next.config.ts·tsconfig.json 변경 없음).

## 테스트
- tsc 클린 · 변경 파일 eslint 클린(전체 lint의 기존 5건은 미변경 파일 — ProfileActions 등) · vitest 104 files / 986 tests 통과 · `next build` 미실행.

## DB
- 변경 없음(스키마·데이터 모두).

## 판단
- HOME → Space → 다시 HOME 탐색은 데스크톱에서 뒤 화면과 스크롤을 유지한 채 창으로 열리고 닫히므로 이전보다 자연스러워졌지만, 실제 HOME 카드 클릭 흐름은 이 환경의 스트리밍 한계로 로컬 브라우저에서 직접 확인이 필요합니다.
