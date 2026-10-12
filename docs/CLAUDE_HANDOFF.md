# Claude Code Latest Handoff

Updated: 2026-10-12 · 커밋 `afba7ba` · 스키마 변경 없음 · API 변경 없음 · 데이터 변경 없음(테스트로 생긴 DiscoveryEvent 2행만 삭제)

두 파트: **A. 작은 UI 보정(코드)** · **B. QR 직전까지의 Persona · User Journey 분석(문서만)**.

## A-1. 새로고침하면 맨 위에서 (`src/lib/reloadScroll.ts`, `src/app/layout.tsx`)

조사 결과
- Next.js 16.1.6 App Router는 `history.scrollRestoration`을 건드리지 않는다 → 새로고침 위치 복원은 브라우저 기본 동작.
- 앱 안 링크 이동은 Next가 새 세그먼트 위로 스크롤(상세 글은 기존 `useArticleScroll`이 링크 이동 시 맨 위 보장), 뒤로가기는 브라우저 기본 복원.
- 휴대폰 HOME 카드 → 상세는 `SpaceDetailModal`이 같은 주소를 `location.reload()`로 다시 불러온다 → HOME에서 내려가 있던 위치가 상세에 그대로 남던 원인이 여기.

구현
- `<head>` 인라인 스크립트(테마 스크립트 다음): **떠날 때(pagehide) 현재 기록 항목을 `manual`**로 → 같은 항목을 다시 불러오는 새로고침은 복원 없이 맨 위. 새 문서는 **load 뒤 `auto`로 되돌림** → 이후 pushState 항목이 auto를 물려받아 앱 안 뒤로가기 복원 유지. bfcache 복귀는 pageshow(persisted)에서 auto.
- 시행착오(실측): 새 문서 `<head>`에서 manual로 바꾸는 방식은 Chrome의 첫 복원 시도보다 늦어 실패. 새 문서에서 auto로 즉시 되돌리면 로딩 중 복원이 다시 일어남 → load 뒤로 미룸.
- `useArticleScroll`: "새로고침하면 읽던 위치 복원"(sessionStorage, 2026-10-05 f4769d4) 제거 — 새 원칙(새로고침 = 맨 위)으로 대체. 링크 이동 = 맨 위는 유지.
- 남는 차이: 같은 탭에서 다른 사이트로 나갔다가 뒤로 돌아오면 그 페이지도 맨 위(외부 링크는 대부분 새 탭).

## A-2~5. 공간 상세 닫기 X (`globals.css .ed-close-btn`, `SpaceDetailModal.tsx`, `SpaceDetail.tsx`, `DetailCloseButton.tsx`)
- 공용 클래스 `.ed-close-btn`: 테두리 · 사각 상자 · 그림자 없음. 누름 영역 44px 원, 안쪽 36px 원 = 바탕색 78% 반투명 + blur 6px(바탕 위에서는 안 보이고, 스크롤해 사진 · 카드 위를 지날 때만 X를 받침). hover/active는 `--ed-soft`. focus-visible은 기존 2px 외곽선(원형).
- 데스크톱 창: sticky, 창 오른쪽 위 모서리(`mt-1.5 mr-0.5`) — 글자 X가 본문 좌우 여백(40px) 안에 있어 사진(본문 720px)과 가로로 6px, 세로로 6px 떨어짐.
- 휴대폰 페이지: X를 사진 안에서 빼서 사진 위쪽 여백(main `pt-3` → `pt-12`)의 화면 오른쪽 위로. `right: max(4px, env(safe-area-inset-right))`. 사진이 36px 내려감.
- 다크: 글자 `#ecebe8`, 원 = `#161616` 78%. 라이트: 글자 `#111`, 원 = 흰색 78% → 밝은 사진 · 어두운 사진 모두에서 보임.

## A-6. 검증
- tsc 통과 · 변경 파일 eslint 통과 · vitest `src/lib/{editorial,archive,home,search}` 219개 통과.
- 브라우저 창이 숨겨진 상태(뷰포트 0, rAF 없음)라 고정 크기 iframe + rAF 대체로 실측(로컬 dev, 운영 DB):
  - 새로고침: `/spaces/booknook-yeonnam` 1000 → 0, 1100 → 0, HOME 2000 → 0, `/curation/…` 1500 → 0. 새로고침 뒤 `scrollRestoration`은 auto로 복귀.
  - 뒤로가기: 새로고침한 상세에서 900까지 내림 → 다른 공간 링크(맨 위 0) → 뒤로 → 900 복원.
  - 휴대폰 375: HOME 1323에서 카드 → 상세 다시 불러옴 → **0** → X → HOME **1323** 복원.
  - 데스크톱 1280: HOME 600 → 카드 → 창(800px) → 창 안 스크롤 → X → HOME 600, 창 닫힘. X 테두리 0 · 그림자 없음.
  - 휴대폰 X: 버튼 하단과 사진 상단 2px, 글자와는 14px. 가로 넘침 없음.
- 확인 못 한 것: 숨긴 창이라 iframe에 키보드 포커스를 줄 수 없어 Tab 포커스 링을 눈으로 보지 못함(네이티브 button + 기존 focus-visible 규칙). 실제 iPhone · Safari 미확인.
- 테스트 중 생긴 DiscoveryEvent 2행(내 anonId `bda5aeaf…`) 삭제, 남은 것 0.

## B. 분석 문서 — `docs/pre-qr-persona-user-journey-2026-10.md`
- 대표 Persona: 망원 사는 29세 디자이너 "윤서", 토요일 오후 혼자 오래 머물 동네 공간을 찾음.
- Golden Path 12단계(Instagram → CURATION → 상세 → 저장 → 내 공간 · 지도 → 함께 소개된 공간 → 상세 재방문 → 외부 지도 → 방문 → Cube → QR 직전), 단계마다 7항목.
- 핵심 판단: 뼈대는 완성. 끊김은 ① 비로그인 저장 · 다녀왔어요가 로그인 뒤 실행 안 됨 ② 저장 뒤 돌아올 계기 없음 ③ 운영시간 0/6 · 현장 Cube 위치 안내 없음. 추천 · 사람은 공간 6곳에서 휴면(공개 프로필은 공개 공간만 → 같은 6곳만 가리킴).
- TOP 3: 처음 온 사람의 첫 행동 지키기 / "오늘 가자" 정보 채우기 / 저장한 공간을 다시 꺼내는 순간 만들기.

## 결정이 필요한 것
- 상세 글(PEOPLE · THOUGHT · CURATION)도 새로고침하면 맨 위 — 10/05에 일부러 넣은 "읽던 위치 복원"을 이번 요청 원칙으로 대체함. 긴 글만 예외로 되살릴지.
- 휴대폰 상세는 X가 사진 위 여백으로 나와 사진이 36px 내려감. 더 줄이려면 X를 Navbar 줄로 올리는 방법(Navbar 수정 필요)이 있음.
- 문서 13장 운영 항목: 공간 6곳 운영시간 입력, Cube 위치 한 줄, `/cube-spaces`의 "운영자의 이야기" 약속(6곳 모두 비어 있음), HOME "새로 소개 · 함께한 공간" 선반 숨김, 태그 3~5개.

## 배포 후 확인할 것
1. 아무 화면에서 아래로 내린 뒤 F5 → 맨 위에서 열리는지(데스크톱 Chrome · 휴대폰 Safari).
2. HOME 내려서 카드 → 상세 → 뒤로가기 → HOME이 보던 위치인지.
3. 휴대폰: HOME 중간 카드 → 상세가 맨 위에서 열리고, 오른쪽 위 X가 사진과 겹치지 않는지 · 누르면 HOME 같은 위치.
4. 노트북: HOME 카드 → 창 오른쪽 위 X(테두리 없음), 창 안에서 스크롤해 이야기 줄 위를 지날 때 X가 보이는지, ESC · 바깥 클릭.
5. 다크 모드에서 X가 사진 위 · 바탕 위 모두 보이는지.
