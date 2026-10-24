# Claude Code Latest Handoff

Updated: 2026-10-24 · 한이음 최종 제출 전 소스 감사 (코드·DB·스키마 변경 없음)

## 결과물
- 감사 문서: `docs/final-submission-audit-2026-10-24.md` (요약 7항목, 9/7→HEAD 변경, DB/ERD, KPI, 운영 데이터, Golden Path, Gap, 보고서·설계서 Delta, 검증 상태)
- 원칙: 9/7 QR 이후 경험은 유지, Discovery는 "추가 개발"로 구분 (기존 핵심 구현 / 이후 추가 / 현재 상태)

## 2026-10-24 망원동 중심 시연 구성 · 추천 Fallback · 시연 CURATION/STORY
- 시연용 가상 공간 11곳(`src/lib/home/fixtures.ts`, `public/demo/*.jpg`, slug `fixture-1~11`)은 일반 방문자에게 공개(`ENABLE_PUBLIC_DEMO_SPACES`, features.ts). 사진 없는 임시 공간 30곳은 코드에서 제거. 지역은 전부 시연용 분류 "망원"(실제 소재지 아님). DB·Cloudinary 변경 없음, KPI·저장·방문·Discovery 이벤트에 안 들어감.
- HOME: 개인화 근거가 있으면 기존 "회원님을 위해 엄선한 공간"(개인화 순위), 없으면 `pickDiscoverySet`(shelves.ts)으로 사진 있는 공간을 유형·지역·태그가 겹치지 않게 골라 "먼저 둘러보기 좋은 공간"(취향 분석 아님, 별도 집계 없음). "망원동 시연 컬렉션" 선반(가상 11 + Partner 5, 아카커피룸 제외; Partner의 DB 지역·좌표는 그대로)이 기본 HOME의 망원 지역 선반을 대신하고, `?area=망원` 지역 화면은 그대로 동작.
- 시연 콘텐츠: `src/lib/editorial/demoContent.ts`(코드 데이터) — CURATION 4(혼자 보내는 오후 / 음악을 천천히 듣는 날 / 책과 함께 머무는 공간 / 작은 물건을 오래 들여다보는 날), PEOPLE 3(가상 페르소나, 인용·인터뷰 없음), THOUGHT 3. 모두 맨 앞 "시연용 콘텐츠" 안내, 카드 머리줄에 "시연용", 대표 이미지는 콘텐츠마다 서로 다른 사진. `queries.ts`가 DB 콘텐츠 앞에 합쳐 HOME·/curation·/story·상세·공간 상세 "소개된 이야기"에 나옴.
- 기존 콘텐츠 12개(전부 "더미 콘텐츠"·샘플 본문, 실제 Partner 사진 사용)는 삭제 없이 대표 이미지 중복 5건만 DB에서 ARCHIVED(상태만 변경, 복원은 status=PUBLISHED): CURATION `places-to-clear-your-mind`·`places-for-two-with-space`·`spaces-worth-visiting-themselves`, PEOPLE `a-place-built-around-music`, THOUGHT `why-we-return-to-the-same-place`. 유지: CURATION 3 · PEOPLE 2 · THOUGHT 2.
- 끄기: `ENABLE_PUBLIC_DEMO_SPACES=false`(공간·콘텐츠 모두 사라짐). 한계: 시연 공간의 "저장"은 화면 안에서만 바뀜(mock), 개인화 순위 후보에는 가상 공간이 들어가지 않음.

## 다음 P0 작업
1. 공개 실제 6곳 태그 입력 (현재 전부 `tags=[]`)
2. 일반 문화공간 확장(`scripts/bulk-import-spaces.ts`, 기본 Dry-run, 미실행) 또는 "6곳 파일럿" 범위 확정 — 일반 공간은 지도 좌표 없음
3. 비관리자 계정으로 MAP_CLICK 기록 → QR 전환 KPI 수동 QA (현재 MAP_CLICK 0건)
4. 기능 동결 후 `tsc` + 전체 `vitest run` + `build` 1회, 배포본 Golden Path 통주행
5. 보고서·설계서 ↔ 코드 정합 (모델 65개, 충돌 표 정리, 샘플 STORY/CURATION 표기 방침)

이전(10/21) 일괄 등록 스크립트 handoff는 git history(`115d3ce`) 참고.
