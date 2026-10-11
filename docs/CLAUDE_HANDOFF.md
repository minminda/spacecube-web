# Claude Code Latest Handoff

Updated: 2026-10-11

## Status

HOME 1차 구조 개편 — "공간을 발견하는 경험"을 전면으로. 브랜치 `claude/home-discovery-hub`(master `335142a` 기준, 미merge).
DB · 스키마 · 관리자 · 추천 알고리즘은 바꾸지 않았다.

## Completed

- HOME(`src/app/EditorialHome.tsx`)을 발견 허브로: LATEST(Hero) → 지역 · 테마 입구 → 선반들(가로 스크롤) → Experience.
  - 선반: 회원님을 위해 엄선한 공간(로그인 + 취향 데이터) / 공간큐브가 엄선한 공간(그 외) · 내가 찜한 공간 · 새롭게 소개한 공간 · {지역}에서 머물고 싶은 곳 · 최근 CURATION · 테마 선반(책 · 음악 · 영화 · 커피 · 전시 · 혼자 · 대화 · 저녁 · 작은 숍, 공간이 3곳 이상일 때만) · 새로운 STORY · 다시 떠올려볼 공간(다녀온 곳) · 공간큐브와 함께한 공간.
  - 공간 하나가 여러 선반에 동시에 나온다. 카드: 사진(없으면 플레이스홀더) · 이름 · 지역 · 유형 · 이유 한 줄(큐레이션 선정 이유 > 추천 이유 > 한 줄 소개). 별점 · 순위 · 퍼센트 없음.
  - 지역 선택(`RegionPicker`): 휴대폰 바텀시트 / 데스크톱 모달, 검색 + 추천 지역(망원 · 연남 · 후암 · 서촌 · 성수) + 등록된 지역. `/?area=후암`이면 선반이 그 지역 중심(먼저 가볼 공간 · {지역}의 {유형} · {지역}에서 {테마} · 지역 큐레이션). 공간이 없는 지역은 안내 문구.
  - 비로그인은 계정 선반 대신 한 줄 로그인 안내. 데이터가 부족한 선반은 만들지 않는다.
- 넓은 화면: `.ed-wide`(최대 1680px, 좌우 20/40/56px)와 `.ed-shelf`(가로 스크롤, 화면 끝에서 다음 카드가 잘려 보임, 데스크톱 ← → 버튼). 읽는 화면의 `.ed-container`(1200px)는 그대로. Navbar도 `.ed-wide`.
- 메뉴(☰): 비로그인 하단 "로그인"(48px), 로그인 하단 "설정 · 로그아웃"(48px, 로그아웃은 회색 톤). 데스크톱 상단에도 비로그인 "로그인". 로그인 · 로그아웃은 기존 `/login` · `signOut` 그대로.
- 설정: 닉네임 · 공개 프로필 · 계정 세 구획(제목 + 설명), 48px 입력 · 버튼, 로그아웃 큰 버튼. API · 동작은 그대로.

## 데이터

- 기존 재사용: `getFinderPool` → `getFinderViewer` → `rankCandidates` → `cardReason`(추천 > 공간과 같은 정렬 · 이유), 큐레이션 공간별 선정 이유(`EditorialCurationSpace.note`), 찜(`SavedEditorialSpace`), 방문(`visitedSlugs`), `listAreas` · `normalizeArea`, `listContentStream`(LATEST), `listCurations` · `listStoryItems` · `listCubeSpaces`.
- 지역 · 테마는 새 테이블 없이 `EditorialSpace.area · category · tags`에서 만든다(`src/lib/home/shelves.ts` — 이후 Region/Theme 데이터로 바꿀 때 입력만 교체).
- 임시 공간: `src/lib/home/fixtures.ts`(이름 "임시 · …", 사진 없음, 상세 링크 없음). 관리자 · 로컬의 `/?preview=fixtures`에서만 선반에 섞이고, 운영 일반 방문자에게는 절대 보이지 않는다. 운영 DB에 넣지 않았다.

## Key files changed

- 신규: `src/lib/home/shelves.ts`(+test), `src/lib/home/homeData.ts`, `src/lib/home/fixtures.ts`, `src/components/home/Shelf.tsx`, `HomeSpaceCard.tsx`, `RegionPicker.tsx`, `src/components/settings/SettingsSection.tsx`
- 수정: `src/app/EditorialHome.tsx`, `src/app/page.tsx`(area · preview=fixtures), `src/app/globals.css`, `src/components/Navbar.tsx`, `src/components/SettingsForm.tsx`, `src/components/profile/ProfileSettingsSection.tsx`, `src/app/settings/page.tsx`, `src/components/editorial/LatestSlider.tsx`(containerClassName 옵션만)

## DB / schema

- Changed: no

## Verification

- TypeScript 통과 / vitest 64 files · 630 tests 통과(신규 14) / 변경 파일 eslint 통과 / `next build` 성공
- 로컬 dev + 임시 Postgres(공개 공간 12 · 큐레이션 2 · PEOPLE 2 · THOUGHT 1 · 로그인 세션 · 찜 2)로 Playwright 375 · 390 · 768 · 1440 확인:
  가로 넘침 없음, 선반 가로 스크롤 · 다음 카드 잘려 보임, 지역 시트 검색(“후암동” → 후암) · 선택 후 지역 선반, 빈 지역 안내, 메뉴 로그인/설정/로그아웃 48px, 설정 모바일 · 데스크톱, 콘텐츠 0편일 때 준비 중 문구, 주요 라우트 200.

## Problems found / 다음 단계(구현하지 않음)

- Navbar는 넓은 컨테이너, 다른 페이지 본문은 1200px — 큰 화면에서 로고와 본문 왼쪽 시작점이 다르다. CURATION · 추천 목록도 넓힐지 결정 필요.
- 실제 운영을 위한 다음 단계 우선순위: ① Space 개별 등록 정리(사진 · 한 줄 · 선정 이유) ② Space ↔ 여러 Curation/Theme 연결 관리(지금은 태그 키워드) ③ Region 정규화(동네 이름 · 추천 지역 순서를 관리자에서) ④ Theme 관리(선반 제목 · 노출 순서 · 공간 지정) ⑤ HOME 선반 순서 · 노출 관리(Admin) ⑥ "새롭게 소개한" 기준을 publishedAt으로(현재는 생성 순).
