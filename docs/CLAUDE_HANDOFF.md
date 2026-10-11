# Claude Code Latest Handoff

Updated: 2026-10-11

## Status

HOME 2차 개편 완료 — 서비스의 최상위를 **HOME · 검색 · 내 공간**으로 정리. commit `c0f0079` (master, push됨).
1차 HOME Discovery Hub(`claude/home-discovery-hub`)는 그대로 두고 그 위에서 진행했다(선반 · RegionPicker · HomeSpaceCard 재사용).

## Completed

- **Navigation**
  - 상단 바: 데스크톱 · 모바일 모두 `로고 + ☰`(데스크톱은 검색 아이콘 추가). 데스크톱 높이 68px / 모바일 56px — `--nav-h` CSS 변수(방명록 캔버스 · 읽기 진행 바 · 고정 배너가 이 값을 따른다).
  - ☰ 메뉴(데스크톱은 오른쪽 400px 패널, 모바일은 전체 화면, 내용 동일): 콘텐츠(CURATION · STORY) / 탐색(지역 둘러보기 `/search#regions` · 테마 둘러보기 `/search#themes`) / 사용자(내 공간 · 설정) / 로그인 · 로그아웃 / 보조 링크.
  - 모바일 하단 탭 `홈 · 검색 · 내 공간`(`BottomTabBar`): 벡터 아이콘, safe-area, 문서 끝 spacer. `/space/…` `/c/…` `/login` `/admin` `/operator` `/preview`에서는 숨김. 비로그인 `내 공간`은 `/login?callbackUrl=/archive`.
  - `추천` 메뉴 제거. `/find`(제목 "탐색") · `/recommend`(→ /find) · `/recommendation`은 주소만 유지.
- **HOME**: `회원님을 위해 엄선한 공간`(기존) → `관심 지역에서 발견한 공간`(별표한 지역을 합친 선반, 일반 지역 선반에서 해당 지역 제외) → `나와 비슷한 사람들이 좋아한 공간`(rankPeople에서 이유가 있는 사람들의 공개 공간 중 내가 안 가본 곳) → `취향이 비슷한 사람`(아바타 + 이름만) → 기존 선반. 검색 입구 한 줄 · 관심 지역 칩 추가.
- **검색 `/search`**: 이름 · 지역 · 유형 · 태그 · 한 줄 소개 · 상세 설명 · 큐레이션 제목/요약 · 선정 이유를 합쳐 관련도 순으로. 점수는 순수 함수(`src/lib/search/spaceSearch.ts`) — 이름 정확 100 > 이름 앞부분/단어 80 > 지역 정확 75 > 유형 정확 65 > 태그 정확 60 > 테마 50 > 이름 일부 45 > … > 설명 10, 여러 단어는 합산(+모두 맞으면 30). `연남동`=`연남`, 한 글자 단어는 정확 일치/테마만. 지역 결과("망원 둘러보기")가 공간 결과 위. 검색어 없으면 추천 지역 · 추천 테마. `/api/search?q=`.
- **관심 지역(별표)**: `RegionStar`(윤곽선/채운 벡터 별). RegionPicker · 검색 지역 결과 · 지역 HOME 제목 · 내 공간 관심 지역에서 저장/해제. 로그인 = `SavedRegion` 테이블(`/api/regions`), 비로그인 = 쿠키 `sc_regions`(로그인 후 병합 없음). 최대 12곳.
- **내 공간**(`/archive` 라우트 유지): 사용자 문구 "내 아카이브" → "내 공간" 전부. 공간큐브와 함께한 공간 · 관심 지역 · 설정 진입 추가, "이 취향과 비슷한 공간" → 홈으로.
- **다크 모드**: 설정 › 화면 테마(라이트/다크). 저장은 기기(localStorage `sc-theme`), `layout.tsx` head 스크립트가 첫 페인트 전에 `html[data-ed-theme="dark"]` 적용. 토큰은 `globals.css`(`:root` 라이트 + `[data-ed-theme="dark"] .editorial-bleed, .ed-chrome` 다크, charcoal `#161616`). **Cube(QR 현장) 화면은 라이트 유지.** `/settings`는 비로그인도 열린다(테마만 + 로그인 안내).
- 아이콘: 이모지 없이 `src/components/icons.tsx`(Lucide 스타일 직접 작성 — 프로젝트에 아이콘 라이브러리 없음).

## Key files

- 신규: `src/app/search/page.tsx`, `src/components/search/SearchView.tsx`, `src/lib/search/{spaceSearch,searchData}.ts`(+test), `src/app/api/{search,regions}/route.ts`, `src/lib/regions/{saved,savedRegions}.ts`(+test), `src/components/{BottomTabBar,icons}.tsx`, `src/components/home/{RegionStar,SimilarPeopleShelf}.tsx`, `src/components/settings/ThemeSetting.tsx`, `src/lib/theme.ts`(+test), `src/lib/client/useSiteViewer.ts`, `src/lib/people/similarPeople.test.ts`
- 수정: `Navbar.tsx`, `layout.tsx`, `globals.css`, `EditorialHome.tsx`, `src/app/page.tsx`, `src/lib/home/homeData.ts`, `src/lib/people/peopleData.ts`(loadRankedPeople 추출 + `similarPeopleForHome`), `RegionPicker.tsx`, `Shelf.tsx`, `archive/page.tsx`, `settings/page.tsx`, `SettingsForm.tsx`, `find/page.tsx`, "내 공간" 문구 치환 파일들

## DB / schema

- Changed: **yes — additive only.** 새 테이블 `SavedRegion`(`saved_regions`: id · userId→User(cascade) · area · createdAt, unique(userId, area), index(userId, createdAt)). 기존 테이블 · 데이터 변경 없음. 빌드(`prisma db push`)가 배포 때 자동 반영하며, 로컬 dev가 운영 DB를 쓰므로 이미 반영됨(`migrate diff`로 CREATE TABLE만 확인 후).
- 테마는 스키마 없이 localStorage(기기 단위).

## Verification

- TypeScript 통과 / vitest 96 files · 942 tests 통과(신규: 검색 랭킹 19 · 관심 지역 · 테마 · 비슷한 사람 5) / 변경 파일 eslint — 내가 건드리지 않은 `recommendation/page.tsx`의 기존 3건(`jsx-no-comment-textnodes`, HEAD에도 동일)만 / `next build` 성공.
- 로컬 dev + 데모 뷰어 세션(검증 후 삭제)으로 390 · 375 · 768 · 1440 확인: HOME(로그인/비로그인), 메뉴(모바일 전체 · 데스크톱 패널), 하단 탭, 검색 랜딩 · 결과(`망원 LP` · `LP` · `책` · `연남동` · 결과 없음), 별표 저장(쿠키 · 계정), 관심 지역 선반 · 칩, 내 공간, 설정 테마 토글 · 새로고침 유지, 지역 시트, 다크 모드(HOME · 검색 · 탐색 · 공간 상세 · STORY · 설정).
- 테스트 데이터(SavedRegion 2건 · 세션)는 모두 삭제.

## Problems found / 사용자 결정이 필요한 것

- 다크 모드는 에디토리얼 화면 + 상단/하단 바에만 적용(Cube QR 현장 화면 · 로그인 · 소개 등 옛 화면은 라이트). 로그인/소개/Cube까지 다크로 할지 결정 필요.
- 테마 · 비로그인 관심 지역은 기기 단위 — 계정 기반 테마(User 필드)와 로그인 후 쿠키 지역 병합은 구현하지 않았다.
- `/find`(탐색)에 지역 · 카테고리 필터가 남아 있어 `/search`와 기능이 겹친다. 합칠지(필터를 검색으로) 결정 필요.
- "내가 저장한 공간과 비슷한 곳" 선반은 따로 만들지 않았다(기존 `회원님을 위해 엄선한 공간` 정렬이 저장 · 방문 신호를 이미 쓴다).
- CURATION · STORY는 검색 대상이 아니다(구조만 확장 가능: `SearchDoc`과 같은 모양의 문서를 더 만들면 됨).
- `similarPeopleForHome`은 후보를 최대 40명으로 자르고 사람마다 공개 공간을 조회한다(기존 `recommendPeople`의 N+1과 같은 구조 — 사용자가 늘면 배치 조회로).
- 데스크톱 상단 바(`ed-wide`)와 본문(1200px)의 왼쪽 시작점 차이는 1차 handoff 그대로.
- 검색 결과 상한 48곳(전체 개수는 표시) — 더 보기는 아직 없다.
