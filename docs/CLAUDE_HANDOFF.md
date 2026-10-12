# Claude Code Latest Handoff

Updated: 2026-10-12 (관리자 공간 지도 / Admin Coverage Map) · DB·스키마·추천·사용자 화면 변경 없음

## 한 일
- **`/admin/spaces/map`** (사이드바 Cube Operation > 운영 공간 > 공간 지도): 관리자 전용. Kakao Maps JS SDK + 내장 `MarkerClusterer`(추가 의존성 없음, 스크립트 동적 로드).
  - 검색(공간명·주소 부분일치, 클라이언트 필터 — 운영 공간 수가 적음), 필터(지역=Space.district 실제 값, 유형=`resolveSpaceTypeLabel`, 상태=공개/비공개/시연), 시연(isDemo) 공간은 기본 제외 + "시연 공간 포함" 토글.
  - 마커 클릭 → 이름·지역·상태·주소 + "공간 관리 열기"(`/admin/[id]/edit`). 상단 "전체 N · 지도 표시 N · 위치 정보 없음 N"(필터 반영), 위치 없는 공간은 접이식 목록으로 링크.
  - `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` 없거나 SDK 로드 실패 시 안내 문구만 표시(Admin 전체는 안 깨짐).
- **공간 등록/수정 폼 "위치 검색"** (`PlaceSearch.tsx`): `GET /api/admin/places/search?q=` (관리자 전용, 서버가 Kakao Local 키워드 검색 호출, `src/lib/kakaoLocal.ts`). 선택 시 **상세 위치(`location`) + 좌표만** 반영, 다른 필드는 건드리지 않음. "좌표 지우기" 가능.
- `POST /api/spaces`, `PATCH /api/spaces/[id]`가 `lat`/`lng` 수용(한국 범위 검증, 범위 밖이면 기존 값 보존, 둘 다 null이면 삭제). 권한 검증 기존 그대로.

## DB
**변경 없음.** `Space.lat/lng Float?`는 이미 스키마에 있었으나 코드에서 미사용(전 공간 null일 가능성 큼). 주소 = 기존 `Space.location`, 지역 = `Space.district`(문자열), `naverMapUrl`은 그대로. 기존 공간 좌표 자동 채움은 하지 않음(애매함) — 공간 수정 화면에서 하나씩 위치 검색으로 연결.

## 외부 설정 필요
- `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`(JavaScript 키), `KAKAO_REST_API_KEY`(REST 키, 없으면 로그인용 `AUTH_KAKAO_ID` 대체) — `.env.example`에 이름만 추가. Kakao 콘솔 Web 도메인 등록 필요. 변경 후 Vercel 재배포.

## 한계 / 다음
- Partner 필드는 Space에 없어 상태 필터에 넣지 않음. 지도 SDK 실제 렌더·장소 검색은 Kakao 키 없이 검증 불가(관리자 로그인도 에이전트 불가) — 키 설정 후 수동 확인 필요.
- 전체 `next build` 미실행(build 스크립트의 prisma db push 리스크). tsc·eslint(변경 파일)·vitest(kakaoLocal/adminNav) 통과.
