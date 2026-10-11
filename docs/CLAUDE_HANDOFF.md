# Claude Code Latest Handoff

Updated: 2026-10-11 (사람 탐색 확장) · 추천 알고리즘·순서·DB·스키마 변경 없음

## 조사 결과 (이미 있던 것 — 재사용)
- 사람 추천: `lib/people/rankPeople.ts`(규칙) + `lib/people/peopleData.ts`(`recommendPeople`/`similarPeopleForHome`/`searchPeopleTiles`, 후보 전원 배치 조회).
- 사람 페이지: **`/find?tab=people`** (검색 칸 + 추천 그리드, `PeopleSearch`/`PeopleGrid`). 검색 API `/api/people/search`. 카드 → `/@handle` 공개 프로필.
- HOME·`/search` 첫 화면: `SimilarPeopleShelf`(로그인 + 취향 기록 있을 때). 더 보기 → `/find?tab=people`.
- **`/people`은 새로 만들지 않음**: `/people`, `/people/[slug]`는 STORY의 PEOPLE 인터뷰 주소(`/people`은 `/story?type=people`로 리다이렉트)라 충돌한다. 사람 탐색 = `/find?tab=people`.

## 이번 변경
- **메뉴**: ☰ 메뉴 "콘텐츠" 그룹에 `사람` 추가 → `/find?tab=people` (`Navbar.tsx`, 데스크톱·모바일 공통 메뉴).
- **추천 이유**: 실제 겹치는 공간 이름으로 표시 — "북눅을 함께 다녀왔어요" / "북눅 외 2곳을 함께 다녀왔어요" / "북눅 포함 공간 3곳이 겹쳐요". 이름이 없거나 결 겹침이면 기존 문구. `reasonText()`(rankPeople.ts, 순수 함수, 테스트 추가). 순서·점수 무변경. 공간 이름은 한 번의 `findMany`(N+1 없음).
- **카드**: `PersonTile`에 이유 줄(최대 2줄) 추가 — 팔로워 등 SNS 지표는 기존 그대로(이번에 늘리지 않음).
- **`/search` 통합**: `SearchView`가 공간 검색(`/api/search`)과 별개로 `/api/people/search`를 호출해 "사람" 섹션(지역 다음, 공간 위)을 표시. 공간 결과·정렬은 무변경. 사람 결과만 있어도 "찾지 못했어요" 안 뜸.
- `/find?tab=people` 상단에 한 줄 안내 문구.

## 결정/남은 이슈
- **"이름" 검색 = 공개 닉네임 + @아이디.** `User.name`(OAuth 실명)은 공개 화면 어디에도 안 쓰이므로 검색 대상에서 제외(실명 노출 방지). 필요하면 정책 결정 후 추가.
- **검색어 최소 2자**(기존 `peopleQuery` 정책 유지, 전체 목록 노출 방지). "동"처럼 1글자는 결과 없음 → 필요 시 `peopleQuery` 하한 변경.
- 공간 썸네일 2~3개 카드 표시는 안 함(이유 문구로 대체).
- 비로그인: 기존 정책 그대로(공개 공간 많은 순 + 로그인 안내). 본인·이미 따라가는 사람·관리자·테스트 계정 제외는 기존.
- API 응답 필드: avatarSeed·handle·name·image·reason·관계 수·demo만(이메일·ID·인증정보 없음 — 실제 응답 키 확인).

## 확인
- tsc 클린 · eslint(변경 파일) 클린 · vitest 104 files / 989 tests 통과 · `next build` 미실행.
- API 직접 호출: 닉네임 정확/부분(`동민`·`임동`), 아이디(`@demo-min`), 한글, 없는 사용자(빈 배열) 확인. `/find?tab=people` 서버 렌더 확인.
- **못 한 것**: 이 환경은 클라이언트 하이드레이션이 안 돼 `/search`의 사람 섹션(클라이언트 fetch)·로그인 상태 추천 이유·모바일 화면은 직접 못 봄. 사용자 확인 필요.

## DB
- 변경 없음.
