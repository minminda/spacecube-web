# Claude Code Latest Handoff

Updated: 2026-10-11 (HOME 운영 구조 · 테마↔태그 연결 · HOME UI 밀도)

## 이번 세션

1. **선반 진단** — `src/lib/home/shelfDiagnosis.ts`(순수) + `homeDiagnostics.ts`(서버, 공개 방문자 기준 Pool · 데모 제외). `/admin/content/home` 각 선반 아래에 `● 노출 중 / 관리자 숨김 / 공간 수 부족(n / 최소 3) / 해당 공간 없음 / 해당 콘텐츠 없음 / 개인화 데이터 필요 / 로그인 사용자 전용` 한 줄. 노출 체크를 끄면 저장 전에도 "관리자 숨김"으로 바뀐다. 진단 조건은 `homeData.ts`의 선반 생성 규칙과 같다(규칙을 바꾸면 `shelfDiagnosis.ts`도).
2. **테마 ↔ 유형/태그 연결** — 테마(책·음악·커피…)는 공간의 **유형(category) · 태그 · 이름**에 키워드가 들어 있으면 모인다(`shelves.ts matchesTheme`, 소개 문장은 안 봄). 기본 키워드는 코드 `HOME_THEMES`. 관리자 "테마 선반 연결" 섹션(`ThemeRulesManager`)에서 테마별 **연결 키워드 · 현재 공간 수 · 노출 가능/공간 부족/해당 공간 없음 · 모이는 공간 이름**을 보고 키워드만 수정/기본값 복귀. 테마 목록 · 제목 · 매칭 방식 · 최소 3곳은 코드 고정(taxonomy CMS 아님).
   - 저장: **스키마 변경 없음** — `HomeShelf` 행 `key="theme:<테마키>"`, `kind=SYSTEM`, `description`=쉼표 키워드. 행이 없으면 코드 기본값. `buildShelfPlan`은 레지스트리에 없는 SYSTEM 행을 무시하므로 선반 목록에 안 섞인다. API `PUT /api/admin/home-shelves/theme-rules`(`requireAdminApi`).
   - **HOME에만 적용**. 검색(`spaceSearch.ts`/`/search`)은 여전히 코드 `HOME_THEMES`를 쓴다(추천 테마 그대로). 검색에도 맞추려면 `/search` 서버에서 `applyThemeRules`로 themes를 넘기면 된다.
3. **태그 · 유형 운영 규칙(공간 콘텐츠 = EditorialSpace)** — `category`는 공간당 1개 문자열(기존 구조 유지), `tags`는 문자열 배열. 공간 편집 폼(`EditorialSpaceForm`): 유형 칩(`getTypeSuggestions` = 이미 등록된 유형) + 새 유형 경고, 태그 칩(`getTagSuggestions` = 활성 운영 Tag + 이미 공개 공간에 쓰인 태그) + 경고(3~5개 권장 · 목록에 없는 새 태그 · 대소문자/공백만 다른 변형 · 중복) — `src/lib/editorial/spaceQuality.ts`. **차단하지 않는다**(경고만). 새 태그는 `/admin/tags`(운영 Tag)에서 먼저 추가하도록 안내. `/admin/tags`는 운영 공간(Cube)용 Tag/Category 모델이고 공개 공간 `EditorialSpace.tags`와 별개 저장소다(어휘만 공유).
4. **공간 완성도 경고** — 폼 하단 노란 안내 + 발행 확인창에 같은 문구(`publishAdvice`). 비어 있는 것: 지역 · 유형 · 한 줄 소개 · 지도 링크 · 태그 · 공간 소개(= "선정 이유"로 간주; 별도 필드를 만들지 않음). 공개를 막지 않는다.
5. **HOME UI** — 상단 테마 칩 제거(`themeChips` 데이터 필드도 제거; 검색의 테마 칩 · 테마 선반은 유지, 지역 선택 유지). 시스템 선반의 보조 설명(description) 전부 제거 — 편집(EDITORIAL) 선반에 운영자가 직접 쓴 설명만 남는다. 모바일 공간 카드 폭 **31vw→27vw**(375px에서 116→101px, 4번째 카드가 ~22px 걸쳐 보임), 간격 12→10px, 카드 글자 13/11→12/10.5px. 데스크톱 카드(clamp 160~220px) 유지.
6. **Navbar · 폭** — `.ed-wide`(Navbar · HOME · LatestSlider · Shelf · SearchView 공용) `max-width` 1680→2400px, 패딩 모바일 20 / md 32 / xl(1280+) 40px(기존 40/56). 로고는 좌측 · 검색/☰는 우측 가장자리에서 40px. STORY 본문 등 `.ed-container`는 무변경. 1440(카드 187px) · 1920(카드 220px, 7장 노출) 확인.
7. SYSTEM / PERSONALIZED / EDITORIAL 원칙 · 운영자는 노출 · 순서 · (일부) 제목만 — 유지.

## DB / schema

변경 없음(`HomeShelf` 행 재사용). 운영 DB에 추가되는 것은 운영자가 키워드를 수정할 때 생기는 `theme:*` 행뿐(기본값으로 되돌리면 삭제).

## Verification

- tsc · vitest 전체(99 files / 960 tests) · eslint(변경 파일) 통과. `next build`는 `prisma db push`가 포함돼 실행하지 않음.
- 임시 라우트(삭제함)로 확인: 선반 목록 ↑↓ · 노출 토글(진단이 "관리자 숨김"으로 즉시 변경) · 비로그인 저장은 "로그인이 만료되었어요"(401) · 테마 키워드 행을 DB에 임시로 넣었다 지움(음악 1곳→2곳, "기본값에서 수정됨" 반영, 잔여 0) · 공간 폼의 태그/유형/완성도 경고. HOME 모바일 375 / 1440 / 1920 확인.
- **미검증(에이전트는 관리자 로그인 불가)**: 실제 관리자 로그인 상태의 클릭 흐름 — 선반 저장 · EDITORIAL 선반 생성/공간 추가/순서/선정 이유 · 테마 키워드 저장 버튼. 서버 로직(`PUT`/`POST`/`PATCH`)은 이전 세션 e2e와 이번 401 확인까지만. 첫 사용 시 `/admin/content/home`에서 한 번 확인 요망.
- 진단은 **공개(비데모) 공간 기준**이다. 로컬 dev HOME은 큐레이터 프로토타입 때문에 데모 공간이 섞여 선반이 더 많이 보일 수 있다.

## 다음 세션 후보

- 테마 키워드를 `/search`에도 적용할지(현재 HOME만).
- 데이터 정리: 공개 공간 6곳뿐이라 테마 선반은 현재 공개 방문자에게 하나도 안 생긴다(최소 3곳). 태그를 3~5개 정돈하면 책 · 음악 · 커피가 먼저 열릴 가능성이 높다.
- 편집 선반을 지역 화면에도 노출할지 · `EditorialHomeSettings` 제거 여부 · 함께한 공간 "운영자의 이야기"와 Episode 역할 중복(이전 후보 유지).
