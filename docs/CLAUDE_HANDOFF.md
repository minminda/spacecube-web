# Claude Code Latest Handoff

Updated: 2026-10-11 (2차 개편 마감)

## Status

HOME · 검색 · 내 공간 2차 개편을 닫았다. 구현은 master `c0f0079`(+ handoff `26ed45a`)에 이미 있고, 마감 소수정 3건은 **브랜치 `claude/home-2nd-polish`**(master에 merge하지 않음)에 있다.

## 마감 소수정 3건

1. 햄버거 메뉴에서 `탐색` 섹션(지역 · 테마 둘러보기) 제거 → 콘텐츠(CURATION · STORY) / 사용자(내 공간 · 설정) / 로그인 · 로그아웃. 지역 · 테마 입구는 `/search` 첫 화면이 맡는다.
2. `/search` 첫 화면(검색어 없음): 추천 지역 → 추천 테마 → **취향이 비슷한 사람**(HOME과 같은 `SimilarPeopleShelf` · `similarPeopleForHome` 재사용). 비로그인 · 후보 2명 미만이면 숨김. 검색어가 있으면 보이지 않는다.
3. HOME: `취향이 비슷한 사람`을 맨 아래(함께한 공간 뒤, Experience 앞)로 이동. `나와 비슷한 사람들이 좋아한 공간`은 기존 위치 유지.

## 2차 개편 요약(이미 master)

- 최상위 HOME · 검색 · 내 공간, `추천` 메뉴 제거(`/find`(탐색) · `/recommend` · `/recommendation` 주소는 유지), "내 아카이브" → "내 공간"(라우트 `/archive` 그대로).
- ☰ 통일(데스크톱 오른쪽 패널, 높이 68px = `--nav-h`) + 모바일 하단 탭, `/search`(설명 가능한 관련도 점수, `src/lib/search/spaceSearch.ts`), 관심 지역 별표, 다크 모드(기기 localStorage `sc-theme`, Cube 현장 화면 제외).
- 자세한 구조 · 결정은 `docs/PRODUCT_DECISIONS.md` "Top-level structure".

## DB / schema

- 이번 마감 작업: **DB 변경 없음.**
- **`SavedRegion`(`saved_regions`) 테이블은 이미 운영 DB에 반영돼 있다**(2차 개편 때 `prisma migrate diff`로 CREATE TABLE · 인덱스 2 · FK 1만 확인하고 `prisma db push`). 기존 테이블 · 데이터는 바뀌지 않았다. 배포 빌드의 `prisma db push`는 이미 동기화 상태라 추가 변경이 없다.

## Verification

- 관련 테스트(people · search · regions · theme · home 59개) + TypeScript 통과. 변경 파일 eslint 통과. 전체 테스트 · 빌드는 직전 커밋(`c0f0079`)에서 통과(96 files · 942 tests, build OK) — 이번 소수정은 문구/배치 변경이라 재실행 생략.
- 로컬 smoke(데모 뷰어 세션 — 삭제함): 메뉴(로그인/비로그인), HOME 순서(사람 줄이 하단), 검색 첫 화면(로그인 시 사람 노출 · 비로그인 숨김), 검색 결과, 별표 저장/해제(DB 반영 확인), 내 공간, 라이트/다크, 하단 탭(모바일) · 데스크톱 ☰.
- 기존 lint 에러 3건(`src/app/recommendation/page.tsx`, `jsx-no-comment-textnodes`)은 이번 변경과 무관해 그대로 둠.

## 다음 세션 우선순위

**1. Space 상세 통합**
- INFORMATION의 `지도에서 보기 ↗`
- 일반 Space / Partner Space 통합
- EP.1 제목 사전 노출
- QR = Episode Unlock 구조 명확화
- 기존 QR URL 호환(`/c/[code]` · `/space/[slug]`)

**2. Admin 구조 재검토**
- Space 중심 콘텐츠 관리
- Curation / Region / Theme
- Partner / Cube 관리
- 불필요하거나 중복된 기능 정리

**3. Netflix식 Discovery 운영 구조 분석**
- 현재 Agile 방식(데이터에서 선반을 계산) 장단점
- 콘텐츠 증가 시 한계 / 지역 증가 시 한계
- Editorial vs Personalization
- Admin-driven Shelf가 필요한 시점
- 데이터 taxonomy(Region · Theme 테이블화)

**후순위**
- `/find` → `/search` 통합(지역 · 카테고리 필터 중복)
- CURATION / STORY 검색
- 검색 pagination(현재 최대 48곳)
- 테마 계정 저장(User 필드) · 로그인 후 쿠키 지역 병합
- 비슷한 사람 query 최적화(사람마다 공개 공간 조회 — 사용자가 늘면 배치로)

## 사용자 결정이 필요한 것

- 다크 모드를 현장 QR · 로그인 · 소개 화면까지 넓힐지.
- 설정은 비로그인도 열 수 있고 메뉴에 보인다(테마 때문) — 원치 않으면 로그인 전용으로.
