# Claude Code Latest Handoff

Updated: 2026-10-11 (HOME Hero 단순화 + 큐레이션 타이포 + 데스크톱 상세 overlay) · UI/인터랙션만, DB·KPI·추천·태그·지역·fixture 변경 없음

## Hero (`LatestSlider.tsx`)
- `LATEST` 헤더 줄 제거(빈 상태 섹션의 LATEST 제목도 제거). 콘텐츠가 바로 시작.
- 위계: 작은 eyebrow("CURATION 006 · 연남", 11/12px) → 큰 제목(모바일 22px, 데스크톱 40→44px) → 짧은 summary → `보기 →`.
- Hero에 공간이 따로 렌더되던 코드는 없었고, "공간 N곳" 보조 줄(`meta`)만 있어 그 줄을 제거(데이터·관계 무변경).
- `01 / 05`와 `전체 보기 →`는 텍스트 컬럼 좌하단 한 줄(모바일은 텍스트 아래). 인디케이터·좌우 버튼은 유지.

## Curation / Shelf
- Hero CTA `Explore` → `보기`(영문 Explore 전부 제거), 크기 14→16px bold.
- `Shelf.tsx` 제목 20/28 → 22/30px, 오른쪽 CTA 12/14 → 14/16px bold(박스 없음). 모든 선반 공통 컴포넌트라 위계 일관.

## Space Detail overlay (`SpaceDetailModal.tsx`, globals.css)
- 기존: 세로 중앙 느낌의 1120px 창(my-8, 전체 둥근 모서리, 배경 55% 검정).
- 변경: 상단 기준(상단 여백 약 48~64px), 폭 min(1280px, 100%-64px), 높이는 뷰포트 하단까지, 위 모서리만 둥글게 — 뒤 HOME이 좌우·상단에 보임. 내부 스크롤.
- backdrop 38% 검정 + blur 2px. 진입: opacity + translateY(16px) 0.22s(`ed-modal-in`), `prefers-reduced-motion`이면 애니메이션 없음.
- 닫기 X는 sticky(내부 스크롤해도 우측 상단 고정). X·바깥 클릭·ESC·뒤로가기 유지.
- 열릴 때 패널 `focus({preventScroll:true})` — 기존엔 포커스가 패널을 상단 여백만큼 스크롤시켜 상단 여백이 사라졌음(수정).
- `@modal` + `(.)spaces/[slug]` 구조·URL·history 무변경. 모바일은 기존 독립 페이지 유지.

## 직접 확인 (localhost:3000)
- 1440: LATEST 없음, h3 44px, 가로 오버플로 없음, 상세 overlay 열림(top 64px, 폭 1280, backdrop rgba(0,0,0,.38), 애니메이션 적용), X sticky(스크롤 후에도 같은 위치), ESC 닫힘, router.back 닫힘.
- 375: Hero 제목 22px, 전체 보기 존재, 가로 오버플로 없음.
- **못 한 것**: HOME 카드 실제 클릭은 이 환경 하이드레이션 한계로 `next.router.push`로 대체. 1920·스크린샷 시각 확인·긴 제목/이미지 없는 슬라이드 실측·모바일 카드→상세→X 흐름은 직접 확인 못 함(코드 무변경). 사용자 확인 필요.

## 테스트
- tsc 클린 · 변경 파일 eslint 클린 · vitest 104 files / 986 tests 통과 · `next build` 미실행.

## DB
- 변경 없음.
