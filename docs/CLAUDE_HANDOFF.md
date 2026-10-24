# Claude Code Latest Handoff

Updated: 2026-10-24 · 한이음 최종 제출 전 소스 감사 (코드·DB·스키마 변경 없음)

## 결과물
- 감사 문서: `docs/final-submission-audit-2026-10-24.md` (요약 7항목, 9/7→HEAD 변경, DB/ERD, KPI, 운영 데이터, Golden Path, Gap, 보고서·설계서 Delta, 검증 상태)
- 원칙: 9/7 QR 이후 경험은 유지, Discovery는 "추가 개발"로 구분 (기존 핵심 구현 / 이후 추가 / 현재 상태)

## 2026-10-24 망원동 중심 시연 구성 · 추천 Fallback · 시연 CURATION/STORY
- 시연용 가상 공간 11곳(`src/lib/home/fixtures.ts`, `public/demo/*.jpg`, slug `fixture-1~11`)은 일반 방문자에게 공개(`ENABLE_PUBLIC_DEMO_SPACES`, features.ts). 사진 없는 임시 공간 30곳은 코드에서 제거. 지역은 전부 시연용 분류 "망원"(실제 소재지 아님). DB·Cloudinary 변경 없음, KPI·저장·방문·Discovery 이벤트에 안 들어감.
- HOME: 개인화 근거가 있으면 기존 "회원님을 위해 엄선한 공간"(개인화 순위), 없으면 `pickDiscoverySet`(shelves.ts)으로 사진 있는 공간을 유형·지역·태그가 겹치지 않게 골라 "먼저 둘러보기 좋은 공간"(취향 분석 아님, 별도 집계 없음). "망원동 시연 컬렉션" 선반(가상 11 + Partner 5, 아카커피룸 제외; Partner의 DB 지역·좌표는 그대로)이 기본 HOME의 망원 지역 선반을 대신하고, `?area=망원` 지역 화면은 그대로 동작.
- 시연 콘텐츠: `src/lib/editorial/demoContent.ts`(코드 데이터) — CURATION 4(혼자 보내는 오후 / 음악을 천천히 듣는 날 / 책과 함께 머무는 공간 / 작은 물건을 오래 들여다보는 날), PEOPLE 2(가상 페르소나, 인용·인터뷰 없음; `demo-persona-records`는 10/24 제거), THOUGHT 3. 모두 맨 앞 "시연용 콘텐츠" 안내, 카드 머리줄에 "시연용", 대표 이미지는 콘텐츠마다 서로 다른 사진. `queries.ts`가 DB 콘텐츠 앞에 합쳐 HOME·/curation·/story·상세·공간 상세 "소개된 이야기"에 나옴.
- 기존 콘텐츠 12개(전부 "더미 콘텐츠"·샘플 본문, 실제 Partner 사진 사용)는 삭제 없이 대표 이미지 중복 5건만 DB에서 ARCHIVED(상태만 변경, 복원은 status=PUBLISHED): CURATION `places-to-clear-your-mind`·`places-for-two-with-space`·`spaces-worth-visiting-themselves`, PEOPLE `a-place-built-around-music`, THOUGHT `why-we-return-to-the-same-place`. 유지: CURATION 3 · PEOPLE 2 · THOUGHT 2.
- 끄기: `ENABLE_PUBLIC_DEMO_SPACES=false`(공간·콘텐츠 모두 사라짐). 한계: 시연 공간의 "저장"은 화면 안에서만 바뀜(mock), 개인화 순위 후보에는 가상 공간이 들어가지 않음.

## 2026-10-24 HOME 정리 2차 — 둘러보기 Fallback · 사진 없는 공간 차단 · LATEST 이미지 적합도
- 사진 없는 공간 차단: `getFinderPool`이 유효한 대표 이미지(`hasValidImageSrc`, 경로/https 형태)가 없는 공간을 후보에서 뺌 → HOME·검색·추천·/find 공통. 원인은 관리자(큐레이터 미리보기)에게 열리던 DB 데모 공간 23곳(`proto-*`, 대표 이미지 없음 · 망원 8)이었음. DB는 그대로(삭제 없음), 노출만 차단. `함께한 공간` 선반도 같은 검사.
- 추천 Fallback: 개인화 순위가 6곳 미만이면 "지금 둘러보기 좋은 공간"(`pickDiscoverySet`: 고른 지역 우선 · 유형/지역/태그 다양성 · 날짜(KST) seed 결정적 셔플). 6곳 이상이면 기존 "회원님을 위해 엄선한 공간". 
- LATEST(`latestPick.ts`): 가로형(비율 1.25~2.2)+가로 1000px↑ 이미지 우선 → 종류 다양성 → 최신순, 같은 이미지는 1회, 세로형·정사각형·이미지 없음 제외. 이미지 크기는 DB에 없어 `KNOWN_SIZES` 표(실측 2026-10-24)를 쓰며 새 대표 이미지를 올리면 한 줄 추가(없으면 "크기 모름"으로 뒤쪽 배치). 시연 사진(`public/demo`)은 전부 세로형이라 LATEST에는 안 나옴(HOME 다른 선반·목록에는 나옴).
- 콘텐츠 정리: CURATION `yeonnam-slow-alone`을 DB에서 ARCHIVED(복원: status=PUBLISHED), PEOPLE `demo-persona-records`(코드 데이터)는 정의 삭제 → 둘 다 직접 URL 404.

## 2026-10-24 심사위원 첫 접속 대비 — 기본 지역 망원 · 망원 통합 컬렉션 · 지역 잠금
- 시연 지역 모드(`ENABLE_PUBLIC_DEMO_SPACES`): `/`는 항상 망원 지역 화면(`지역: 망원`). 실제 Partner 6곳(연남 · 아카커피룸 포함) + 시연용 11곳 = 17곳이 한 컬렉션. DB 지역·주소·좌표·상세 표시는 실제 그대로(탐색 분류만 바뀜). 카드 아래 지역은 실제 지역.
- 지역 선택(`RegionPicker`·검색 지역 결과·`RegionGrid`): 망원만 선택 가능, 나머지는 "준비 중"(`AreaOption.ready=false`, 링크 아님). `/?area=연남` 등은 `/`로 redirect(page.tsx). 지역 "전체" 항목 없음.
- HOME 정리: 지역 화면 선반 제목에서 지역 접두어 제거(실제 연남 공간이 섞이므로), CURATION은 전체 6편, 추천 선반에 "더 보기" 없음(/find는 시연 공간이 없는 화면), 검색 테마 칩은 결과가 있는 것만(영화 숨김). 시연용 공간의 저장·다녀왔어요도 실제 공간처럼 로그인 필요(로그인 후엔 화면 안에서만 변경).
- 검증: tsc · 전체 vitest 119파일/1102개 · next build · 로컬 prod 크롤(내부 링크 54개·이미지 19개 오류 0) · 운영 QR→Episode→방명록 렌더(buk). 미검증: 로그인 후 저장·다녀왔어요 실제 흐름, 포스트잇 작성(기존 코드 무변경), `/c/[code]` 클라이언트 브리지 자동 이동(검증용 숨김 브라우저 창에서 rAF가 멈춰 확인 못 함 — API는 307→Episode 정상), 실기기 모바일.
- 남은 P1(내용 필요): 실제 Partner 6곳 중 4곳은 한 줄 소개·설명 없음("공간 소개를 준비하고 있어요"), 6곳 모두 태그 0 → 검증된 문구·태그 입력 필요(지어내지 않음). P2: 큐레이터·SNS·새 추천 알고리즘·지도 탐색·비활성 기능 재개발.

## 다음 P0 작업
1. 공개 실제 6곳 태그 입력 (현재 전부 `tags=[]`)
2. 일반 문화공간 확장(`scripts/bulk-import-spaces.ts`, 기본 Dry-run, 미실행) 또는 "6곳 파일럿" 범위 확정 — 일반 공간은 지도 좌표 없음
3. 비관리자 계정으로 MAP_CLICK 기록 → QR 전환 KPI 수동 QA (현재 MAP_CLICK 0건)
4. 기능 동결 후 `tsc` + 전체 `vitest run` + `build` 1회, 배포본 Golden Path 통주행
5. 보고서·설계서 ↔ 코드 정합 (모델 65개, 충돌 표 정리, 샘플 STORY/CURATION 표기 방침)

이전(10/21) 일괄 등록 스크립트 handoff는 git history(`115d3ce`) 참고.
