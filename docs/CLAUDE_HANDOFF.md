# Claude Code Latest Handoff

Updated: 2026-10-24 · 한이음 최종 제출 전 소스 감사 (코드·DB·스키마 변경 없음)

## 결과물
- 감사 문서: `docs/final-submission-audit-2026-10-24.md` (요약 7항목, 9/7→HEAD 변경, DB/ERD, KPI, 운영 데이터, Golden Path, Gap, 보고서·설계서 Delta, 검증 상태)
- 원칙: 9/7 QR 이후 경험은 유지, Discovery는 "추가 개발"로 구분 (기존 핵심 구현 / 이후 추가 / 현재 상태)

## 2026-10-24 사진 기반 가상 공간 11곳 (시연 미리보기 전용 · DB 변경 없음)
- 방식: 운영 DB·Cloudinary에 쓰지 않고 기존 fixtures(`src/lib/home/fixtures.ts`)에 사진 기반 가상 공간 `DEMO_SEEDS` 11곳 추가(slug `fixture-31~41`). 사진은 `public/demo/*.jpg`(EXIF 제거, 폭 1400px 이하). 테스트 `fixtures.test.ts` 추가.
- 공개(2026-10-24 변경): `ENABLE_PUBLIC_DEMO_SPACES=true`(features.ts) → 일반 방문자도 HOME·검색·지역·테마·`/spaces/fixture-31~41` 상세에서 11곳을 본다. 카드에 "시연용 공간", 상세 상단에 "시연용 공간 — 실제 장소가 아닙니다" 표시. 글자만 있는 임시 30곳은 계속 관리자·로컬 `?preview=fixtures` 전용(상세는 일반 방문자에게 404). 끄려면 상수를 false로.
- KPI·통계: 코드 데이터라 DB 행이 없고 상세는 DiscoveryTracker·지도 클릭 계측을 안 붙이며 저장은 화면 안에서만 바뀐다(mock) → 방문 통계·전환 KPI에 안 들어감. 개인화 추천 후보에도 안 들어감.
- 공간: 망원 5(창가의 오후·서가 뒤의 창·재즈 음반장·종이 아카이브·구형 카메라 진열) / 연남 5(쪽지와 음반·슬라이드 룸·찻잔 선반·만년필과 우체통·초록 서가) / 용인 처인구 1(물가의 창). 유형·태그는 정본 이름만(3~4개).
- 제외한 사진 4장: 1(앨범 표지 벽) · 2(`Music Complex Seoul` 간판, 기존 DB의 뮤직컴플렉스와 겹침) · 11(손님 얼굴 + 브랜드 머그) · 14(영화·도서 표지/인물). 10(재즈 음반장)은 벽 포스터가 보여 판단 필요, 4(쪽지와 음반)는 타인 손글씨 쪽지가 큼직해 판단 필요.
- 한계: 개인화 추천 후보(`rankCandidates`)는 DB 공간만 대상이라 가상 공간은 정렬·추천 이유에 안 들어가고 HOME 첫 선반 끝에 덧붙음. 가상 공간 이름은 "임시 ·" 접두어가 없다(상세 상단 미리보기 배너·HOME 미리보기 배너로만 표시).
- 이전 시도(실제 공간 식별 등록)는 등록 0건으로 종료.

## 다음 P0 작업
1. 공개 실제 6곳 태그 입력 (현재 전부 `tags=[]`)
2. 일반 문화공간 확장(`scripts/bulk-import-spaces.ts`, 기본 Dry-run, 미실행) 또는 "6곳 파일럿" 범위 확정 — 일반 공간은 지도 좌표 없음
3. 비관리자 계정으로 MAP_CLICK 기록 → QR 전환 KPI 수동 QA (현재 MAP_CLICK 0건)
4. 기능 동결 후 `tsc` + 전체 `vitest run` + `build` 1회, 배포본 Golden Path 통주행
5. 보고서·설계서 ↔ 코드 정합 (모델 65개, 충돌 표 정리, 샘플 STORY/CURATION 표기 방침)

이전(10/21) 일괄 등록 스크립트 handoff는 git history(`115d3ce`) 참고.
