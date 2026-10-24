# Claude Code Latest Handoff

Updated: 2026-10-24 · HOME 상단 원상복구 · LATEST 5개 순서 고정

## 완료
- **HOME 상단**: 서비스 한 줄 정의 두 문구 + "공간큐브 소개 →" 버튼(`/about` 링크) 섹션 전체 제거(`src/app/EditorialHome.tsx`). 소개 섹션 이전 레이아웃(LATEST가 맨 위)으로 복원. `/about` 페이지 · 푸터/내비/Experience 영역의 소개 링크는 그대로.
- **LATEST 고정**: `src/lib/home/latestPick.ts`의 `PINNED_LATEST_HREFS`(상세 주소로 식별) + `pinLatest()`. `homeData.ts`의 `latest`는 이 목록을 순서대로 쓴다. 발행일 · 이미지 적합도 · 개인화 · 랜덤과 무관, 로그인 여부와 무관. 순서: `/thought/demo-conditions-to-stay` → `/curation/demo-small-objects` → `/curation/places-for-music` → `/curation/mangwon-making` → `/curation/demo-solo-afternoon`.
- 조회되지 않는 항목은 대체하지 않고 서버 로그 `console.warn("[home] LATEST 고정 콘텐츠를 찾지 못했어요…")`로 알리고 빠진다. 슬라이더(`LatestSlider`)는 변경 없음(시작 index 0, 자동 전환 순환).
- 기존 `pickLatest`(이미지 적합도 선정)는 코드 · 테스트 유지, HOME에서만 쓰지 않는다.
- 콘텐츠 · 발행 상태 · DB 변경 없음.

## 검증
- tsc · vitest(home 5파일 55개, `pinLatest` 테스트 2개 추가) · `next build` 통과.
- 로컬 dev(실 DB): 소개 문구 · 버튼 없음, LATEST 5장 지정 순서, 휴대폰에서 01/05 · 망원 기본 · 검색창 정상.
