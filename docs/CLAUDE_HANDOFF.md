# Claude Code Latest Handoff

Updated: 2026-10-12 (내 공간 지도 보기 — `/archive?mode=map`) · DB·스키마·API 변경 없음

## 한 일
- **내 공간 리스트 ↔ 지도** (`src/app/archive/page.tsx`): 상단 `TabLinks` "리스트 | 지도". 기본은 리스트, 지도는 `?mode=map`(링크 이동이라 뒤로가기 정상). 지도 모드에서는 기존 필터/그리드 섹션만 숨기고 나머지(헤더·관심 지역·방명록·설정)는 그대로. 비로그인은 기존 로그인 리다이렉트(callbackUrl에 `mode=map` 보존).
- **데이터는 기존 `getLibrary` 재사용** — 지도 전용 테이블/API 없음. `src/lib/archive/libraryMap.ts`: 상태 계산(`mapState`: 재방문(방문 2회+) > 다녀온 곳 > 저장, 저장만 해제+방문 있음이면 유지, 저장도 방문도 없으면 제외), `buildMapPoints`(공간당 마커 1개, 좌표 없음/잘못된 좌표/개인 기록은 `missing`), `getLibraryCoords`(라이브러리 key `s-<slug>` → 운영 `Space.lat/lng` 쿼리 1회, EditorialSpace엔 좌표가 없어 slug로 연결). 방문 횟수 = 개인 기록 방문 + Cube Record(아카이브 상세의 "N번"과 같은 기준, 시연 공간은 getLibrary의 includeDemo 정책 그대로).
- **`src/components/archive/ArchiveMap.tsx`** (클라이언트): Kakao JS SDK만 사용(REST/장소검색/위치권한/주변검색 없음). 마커 = SVG 3종(저장=속 빈 원, 다녀온 곳=채운 원, 또 간 곳=채운 원+바깥 링+가운데 점; 색에만 의존하지 않음). 범례는 같은 SVG. 마커 클릭 → 하단 카드(공간명·지역·상태·방문 횟수 + 방문=“내 기록 보기”(`/archive/p/<key>`), 저장만=“공간 보기”(`/spaces/<slug>`)). 초기 bounds로 전체 맞춤, `setMaxLevel(10)`, 단일 지점은 레벨 4. 높이 `calc(100dvh - 300px)`(380~720px). 좌표 없는 공간은 “지도에 표시되지 않은 공간 N곳 / 지도 위치가 준비 중” details. Empty·SDK 실패 fallback 문구 포함.
- **`src/lib/kakaoMapsSdk.ts`**: SDK 로더만 공통화(중복 로드 방지, 실패 시 재시도). 관리자 `AdminSpaceMap`은 이 로더를 쓰도록 교체(동작 동일, 컴포넌트 import 없음).
- 하지 않은 것: 리스트 카드 “지도에서 보기”, 클러스터링, split view.

## 검증
tsc · eslint(변경 파일) 통과, vitest `src/lib/archive` 통과(신규 `libraryMap.test.ts`: 상태 우선순위, 저장 해제/방문 유지, 좌표 없음·0,0·개인 기록 제외, 공간당 1마커). 로그인/Kakao 키 없이 브라우저 검증 불가 → 실제 마커·카드·모바일 레이아웃은 배포 후 수동 확인. `next build` 미실행.

## 배포 후 확인할 것
1. `/archive` 기본이 리스트인지, “지도” 탭 → 지도, “리스트” 복귀, 브라우저 뒤로가기.
2. 공간 저장 → 지도에 속 빈 원. 방문 기록 → 채운 원. 2회 이상 → 링+점, 카드에 “N번 방문”.
3. 저장 해제(방문 없음) → 마커 사라짐 / 방문 있는 공간 저장 해제 → 마커 유지.
4. 마커 카드의 “내 기록 보기”/“공간 보기” 이동, 모바일에서 카드와 하단 탭 겹침.
5. 좌표 없는 공간(옛 공간은 관리자에서 수정 저장 시 자동 연결)이 “지도에 표시되지 않은 공간”에 잡히는지.
6. Kakao 콘솔 Web 도메인에 운영 도메인 등록(관리자 지도와 동일 키 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`).
