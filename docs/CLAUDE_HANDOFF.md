# Claude Code Latest Handoff

Updated: 2026-10-12 (관리자 Coverage Map 고도화: 지역 + 공간 레이어) · 사용자 화면·추천 변경 없음

## 한 일
- **`/admin/spaces/map`**: 지역 마커(큰 파란 원 + 지역명 라벨, zIndex 높음) + 공간 마커(작은 검정 점) 두 레이어를 CustomOverlay로 표시, 범례 포함. MarkerClusterer는 제거(공간 수 적고 두 레이어 구분이 목적).
  - 지역 마커 클릭 → "등록된 공간 N곳 / 이 지역만 보기". 지역 필터 선택 시 해당 지역 공간만 + 그 지역 마커만, bounds 자동 맞춤(한 점이면 level 4).
  - 통계: 공간 · 지역 · 지도 표시 공간 · 위치 미연결(필터 반영). 검색은 지역명도 매칭(결과 칩 "지역 — / 공간 —"). 좌표 없는 지역은 지도 아래 안내 + `/admin/districts` 링크. 좌표 없는 공간은 목록 + 각 항목 "위치 연결"(공간 수정 화면으로, 지도 페이지에서 DB 직접 수정 없음).
  - **공간↔지역 연결은 FK가 아니라 문자열 → `normalizeArea` 비교**(`src/lib/adminCoverage.ts`, 지역 관리의 `countSpacesInRegion`과 같은 규칙: "연남"="연남동"). 시연(isDemo) 공간은 기본 제외 유지.
- **District.lat / lng** 신규(nullable Float, Space와 동일 naming). SVG용 `markerX/markerY/zoom*`는 그대로이며 Kakao 좌표와 무관. `PATCH /api/districts/[id]`가 `lat/lng` 수용(한국 범위 검증, 둘 다 null이면 해제).
- **지역 관리(`/admin/districts`)**: 행마다 "지도 위치/위치 변경" → `PlaceSearch mode="region"`(주소 검색 우선, 부족하면 키워드 검색 보충: `searchKakaoRegions`) → 선택 시 즉시 저장. 지도 위치 연결 여부 표시, "지도 위치 해제".
- **공간 폼**: "지도 위치" 블록 — 현재 상세 위치 + "지도 연결됨(위도/경도)" 또는 "연결되지 않았어요", 버튼 "위치 다시 검색/주소로 위치 찾기"(검색어 기본값 = 기존 location, 없으면 공간명). 선택 시 `location + lat + lng`가 폼에 반영되고 기존 저장 흐름으로 저장.
- `GET /api/admin/places/search?q=&mode=region` (관리자 전용, 서버에서만 Kakao REST 호출 — 기존 권한 검증 그대로).
- 기존 DB의 location을 서버가 일괄 geocoding 하지 않음(정책 유지).

## DB
`districts`에 `lat`, `lng` nullable 컬럼 2개 추가만(`prisma migrate diff`로 ALTER TABLE ADD COLUMN 2건뿐임을 확인 후 `prisma db push` 적용, 기존 데이터 변경/삭제 없음). build 스크립트의 `db push`는 이제 변경 없음 상태라 안전.

## 운영 데이터 현황(2026-10-12 조회)
- 공간 전체 20 (시연 14 포함) / 좌표 연결 0 / 좌표 없음 20. 시연 제외 운영 공간 6: 북눅 연남·내면의 발견·턴다운서비스(연남동), 다시점·녹화버튼(망원동), 아카커피룸(용인 처인구).
- 지역 전체 3(연남동·망원동·용인 처인구, 모두 ACTIVE) / 지도 좌표 연결 0 / 좌표 없음 3.

## 관리자가 할 일
1. `/admin/districts`에서 연남동·망원동·용인 처인구 각각 "지도 위치" → 검색 → 선택.
2. `/admin/spaces/map` 하단 "위치 정보 없음" 목록에서 운영 공간 6곳(북눅 연남부터) "위치 연결" → 수정 화면 "주소로 위치 찾기" → 선택 → 저장.
3. 시연 공간은 필요할 때만(“시연 공간 포함”).

## 검증 / 한계
- tsc 통과, 변경 파일 eslint 통과(`/admin/*`의 기존 오류 3건은 이번 변경 무관), vitest 전체 994 통과(신규 `adminCoverage.test.ts`).
- 지도 렌더·Kakao 검색·관리자 화면은 에이전트가 관리자 로그인/Kakao 키 없이 브라우저 검증 불가 → 배포 후 수동 확인 필요. 비관리자 차단은 기존 auth/isAdmin 코드 경로 그대로(401/403).
- 전체 `next build`는 미실행.
