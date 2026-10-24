# 한이음 최종 제출 전 소스 감사 (2026-10-24)

> 기준: `master` HEAD `115d3ce` (2026-10-21), origin/master와 동일. 코드·DB 변경 없음(운영 DB는 읽기 전용 조회만).
> 1차 보고서 기준 시점: 2026-09-07. 코드상 대응 기준 커밋은 `9c1e3b8`(9/6, 시연 처리 원복 — 9/7 직전 마지막 커밋).
> 근거: `git log`, `prisma/schema.prisma`(9c1e3b8 대비 diff), route/API, `src/lib`, 운영 DB 읽기 조회(2026-10-24).
> 비교용 기존 스냅샷: [contest-2026-technical-reference.md](contest-2026-technical-reference.md)(9/2 기준, 39개 모델 서술).

## 0. 작성 원칙 (사용자 지시 반영)

이번 최종 제출은 9/7 성과를 **대체하지 않고 확장**한다. 모든 항목을 세 층으로 구분한다.

| 층 | 의미 |
|---|---|
| **A. 기존 핵심 구현 (9/7까지)** | QR → Episode/Scene → 취향 기록 → 방명록 → 아카이브 → 추천. 1차 성과로 **유지**. 9월 이후 UX 단순화로 일부 운영 방식이 바뀌었어도 "삭제 대상"이 아니다. |
| **B. 이후 추가 개발 (9/7~10/21)** | QR 이전 온라인 Discovery(콘텐츠·공간 발견·저장·방문·내 공간·Discovery KPI·Editorial CMS) |
| **C. 현재 서비스 상태** | 지금 실제 사용자에게 보이는 것 / 숨김 / 관리자 전용 |

"과거 구현"과 "현재 운영"이 다른 곳은 본문에서 `[구현 vs 운영]`으로 표시했다.

---

## 요약 (문서 첫 부분 필수 항목)

### 1. 9/7 → 현재 가장 큰 제품 변화 5개
1. **QR 이전 Discovery 계층 신설** — HOME(발견 허브) · 검색 · 지역/테마/선반 · 공개 Space 상세 · 저장 · "다녀왔어요" · 내 공간(Archive)+지도. 서비스의 입구가 "QR 스캔"에서 "온라인 공간 발견 → 저장/방문 → QR"로 확장됨.
2. **일반(공개 Editorial) 공간 ↔ Partner(Cube 운영) 공간 구조 분리** — `EditorialSpace`(공개, Cube 없어도 등록) vs `Space`(Cube 운영). 두 계층은 FK 없이 **slug 동일성**으로만 이어짐. Partner = `EditorialSpace.cubeAvailable`.
3. **Editorial CMS + 콘텐츠 파이프라인** — CURATION / STORY(PEOPLE·THOUGHT) 블록 에디터, 상태·단계(IDEA→PUBLISHED), 실시간 미리보기, HOME 선반 관리, 지역(District)·태그 정본 관리, 관리자 IA를 CONTENT / CUBE OPERATION으로 분리.
4. **첫 방문 흐름 단순화 + 계측 개선** (9/13~9/22) — Story→Guestbook이 로그인·취향점수 없이 가능, 비로그인(anonId) 방명록/공감, Story Complete 판정 수정, 핵심 7단계 퍼널. `[구현 vs 운영]` 취향점수·로그인 게이트 구현은 1차 성과, 현재 운영 경로에서는 거치지 않음.
5. **Discovery → 실제 QR 방문 KPI + 사람/개인 아카이브** — `DiscoveryEvent`(상세조회/지도클릭) → 7일 내 동일 공간 QR 스캔 전환, `ArchiveEntry/Visit/Photo`, 공개 프로필 `/@handle`, 사람 추천, 취향 따라가기.

### 2. 현재 실제 핵심 사용자 Journey (코드 기준)
`HOME(선반·Hero·CURATION/STORY)` 또는 `검색` → `공개 Space 상세(/spaces/[slug])` → `저장`(SavedEditorialSpace) / `다녀왔어요`(ArchiveEntry) → `내 공간(/archive, 지도 모드)` → `지도에서 보기(MAP_CLICK)` → *(현장)* `QR(/c/[code])` → `Episode/Scene` → `방명록`(비로그인 가능) → `완료`. 비로그인 저장/다녀왔어요는 로그인 후 `sc_intent`로 자동 완료.

### 3. 최종 제출 전 P0 TOP 5
1. **공개 실제 공간 6곳 전부 `tags=[]`** (운영 DB 확인) → 테마 선반 0개, 태그 기반 추천/검색 가중이 사실상 비어 있음. 콘텐츠 입력(코드 변경 불필요).
2. **공개 공간이 6곳뿐이고 전부 Partner** — HOME 다양성/지역 선반(지역당 3곳↑) 부족: 연남동 3 / 망원동 2 / 용인 1. 일괄 등록 스크립트는 준비됐으나 **미실행**. 실행 전 District·태그 정본·이미지 준비 필요.
3. **Map Click 이벤트 0건** (DiscoveryEvent: SPACE_VIEW 14, MAP_CLICK 0) → "Map Click→QR 전환"을 수치로 제시할 수 없음. 관리자 계정은 기록 제외이므로 **일반 계정**으로 기록 동작 수동 QA 필요.
4. **일괄 등록 공간은 지도 좌표가 없다** — 내 공간 지도 좌표는 운영 `Space.lat/lng`에서만 읽음(`libraryMap.ts`). 일반 공간(운영 Space 없음)은 지도에서 빠짐 → 시연·보고서에서 "Archive Map"을 보일 땐 Partner 6곳(전부 좌표 있음)만 사용하거나 방침 결정.
5. **최종 검증 미실시/기록 부재** — 전체 test/build가 언제 통과했는지 저장소에 기록 없음. 로컬 `.next`는 10/11. HANDOFF의 136 tests는 `src/lib/{home,editorial}` 범위일 뿐. 기능 동결 후 `tsc + 전체 vitest + build` 1회, 그리고 Vercel 배포본 기준 Golden Path 수동 QA.
   - (참고 위험) 공개 중인 CURATION 6·PEOPLE 3·THOUGHT 3은 **샘플 매거진 본문**(`seed-sample-magazine.ts`, 마커 `[샘플 매거진 본문 2026-10-05]`)이 채워진 더미 STORY/CURATION. 심사자에게 "실제 콘텐츠"로 보이면 안 되므로 시연 전 구분 방침 결정 필요.

### 4. 최종 보고서에 반드시 추가할 기술/기능 TOP 10
1. 공개 Editorial 계층 ↔ Cube 운영 계층 분리 설계(slug 연결, `cubeAvailable`)
2. Editorial CMS(블록 JSON + 서버 검증 `parseBlocks`, 상태·단계 동기화 `pipeline.ts`, 보관 우선 삭제)
3. HOME 선반(Shelf) 엔진 — 지역/테마/개인화 선반, 다양성 재배치 `diversifyShelves`, 선반 진단
4. 검색 — 설명 가능한 순수 점수 함수(`spaceSearch.ts`) + 말뭉치 30초 캐시
5. 추천 — 설명 가능한 태그 이름 매칭(`discoveryRecommend.ts`, 방문 3 / 저장 2 / 아카이브 2.5 / 직접 태그 +1) + 사람 추천(`rankPeople.ts`)
6. 저장·방문 데이터 통합 뷰(`library.ts`: ArchiveEntry·Record·SavedEditorialSpace·SavedSpace를 slug로 합침, 원본 무변경)
7. 내 공간 지도(저장/다녀온/재방문 상태를 계산해 마커화, 새 저장소 없음)
8. Discovery KPI — 고유 방문자 기준 상세조회/저장/지도클릭 → 7일 내 QR 스캔 전환(`discoveryKpi.ts`), userId·anonId 이중 식별
9. 로그인 의도 보존(`pendingIntent.ts`: 일회용 nonce + 30분 TTL)과 비로그인 anonId 체계 확장(방명록/공감/SceneReach)
10. 성능·안정성 — N+1 제거(HOME 209→28, /find 152→27 쿼리), 데스크톱 상세 창 새로고침 복원(`modalRestore.ts`), 운영 DB 오접속 경고, 데모 데이터 비파괴 제외 정책(`isDemo`)

### 5. 제작설계서에서 다시 그려야/보충할 도식·표 (최소 변경 원칙)
- **추가**: 서비스 구성도에 "Discovery 계층(공개 Editorial)" 블록 추가, 메뉴 구성도(HOME·검색·내 공간) 추가, Discovery Journey 흐름도 1장, ERD **보조 도면 1장**(Discovery 계층 + slug 연결점), 테이블 정의서 신규 모델 추가분, 프로그램 목록 추가분.
- **보충(재작성 아님)**: 요구사항/유스케이스에 Discovery 행위자·기능 행 추가, 기능 처리도에 저장/방문/지도클릭/QR 전환 처리 추가.
- **유지**: QR·Episode·방명록·추천(취향점수 기반) 기존 설계는 그대로 둔다. 단 "방명록 진입 경로(로그인·취향점수 게이트)" 도식은 1차 설계 그대로 두되 현재 운영 경로를 각주로 병기 `[구현 vs 운영]`.

### 6. 졸업전시 Golden Path (§7 상세)
`HOME → Partner 공간 카드 → Space 상세 → 저장 → 내 공간(지도) → 지도에서 보기 → [현장] QR → Episode → 방명록 → 완료`. 사용 공간 1순위 `aka-coffee-room`(스캔 83·기록 20·방명록 18, 가장 풍부), 2순위 `booknook-yeonnam`.

### 7. 현재 구현과 기획/설명 문서가 충돌하는 부분
| # | 문서/코드 | 충돌 내용 |
|---|---|---|
| 1 | `PRODUCT_DECISIONS.md` "No separate curator model … Do not introduce CuratorProfile" | 스키마에 `CuratorProfile/CuratorCollection/CuratorCollectionSpace` 존재(4 프로필), 라우트 `/curators`·`/collections` 존재. `ENABLE_CURATOR_PROTOTYPE=false` → 관리자/로컬 전용이라 **HIDDEN/PROTOTYPE**. 보고서에 쓰지 말 것 또는 "프로토타입"으로 표기. |
| 2 | `PRODUCT_DECISIONS.md`/`PROJECT_CONTEXT.md`(10/5) 추천 IA = `/find` 중심 | 10/11 이후 최상위는 HOME·검색·내 공간, `/find`는 내비에서 제거(주소 유지). 문서 상단은 갱신됐으나 하단 서술 일부가 옛 구조. |
| 3 | `contest-2026-technical-reference.md`(9/2) | "방명록=로그인+Record 필요", 39개 모델, 테스트 35파일 → 현재 방명록 비로그인 가능, **65개 모델**, 테스트 파일 87개. 최종 보고서에 그대로 인용 금지. |
| 4 | `src/lib/guestbookFunnel.ts` 상단 주석 | "방명록 열람은 로그인+취향점수 전제" 서술이 9/13 이후 사실과 다름(코드 동작은 정상, 주석만 stale). |
| 5 | `schema.prisma` Editorial 섹션 주석 "기존 모델과 어떤 FK도 갖지 않는다" | 사실상 slug 조인으로 결합(저장 통합 `saves.ts`, 지도 좌표 `libraryMap.ts`, KPI 전환 `discoveryKpi.ts`). ERD에 점선(논리 연결)으로 그려야 정확. |
| 6 | `EditorialHomeSettings` | b9cd4ae 이후 "미사용으로 유지". 테이블은 있으나 HOME은 자동 규칙/`HomeShelf` 사용 → **Legacy**. |
| 7 | 9/7 보고서의 "취향점수 기반 추천" | 현재 운영 추천은 행동 강도(방문/저장/아카이브) 태그 매칭. `PRODUCT_DECISIONS`는 "별점 요구 금지". 취향점수 코드(`recommend.ts`, Record.tasteScore)는 남아 있고 `ENABLE_TASTE_SCORE_RECOMMENDATION=true`이나 `/archive/taste*`는 에디토리얼 모드에서 `/find`로 리다이렉트. `[구현 vs 운영]` |
| 8 | HANDOFF "136 tests" | 전체 아님(`src/lib/{home,editorial}` 범위). |

---

## 1. 현재 제품 구조 (상태 표기)

상태: CURRENT / INTERNAL / HIDDEN / LEGACY / PROTOTYPE / REMOVED. 층: A(기존) / B(이후 추가).

| 항목 | 라우트·근거 | 층 | 상태 |
|---|---|---|---|
| HOME | `/` → `EditorialHome` (`ENABLE_EDITORIAL_HOME=true`, features.ts:86). 관리자 `?legacy=1`은 `LegacyHome` | B | CURRENT |
| Search / FIND | `/search`(내비·하단탭), `/find`(공간·사람 탭; 내비에서 제거, 주소 유지·HOME 선반이 링크) | B | `/search` CURRENT, `/find` CURRENT(비내비) |
| Region / Theme / Shelf | `/?area=`, `/search#regions·themes`, `src/lib/home/*`; 선반 키 12종(for-you·interest·similar·saved·new·area·curation·theme·story·revisit·cube·similar-people). **DB `HomeShelf` 0행 → 코드 기본값으로 동작** | B | CURRENT (공개 실제 공간 6곳이라 area/theme 선반은 조건 미달로 대부분 비어 있음) |
| Editorial Space Detail | `/spaces/[slug]`, 데스크톱 `@modal` 창 + 새로고침 복원 | B | CURRENT |
| Save | `POST/DELETE /api/saves/spaces/[id]`(SavedEditorialSpace), Cube 상세 저장은 `SavedSpace`; slug로 통합 표시 | B(+A의 SavedSpace) | CURRENT |
| Visit / Revisit | 상세 "다녀왔어요/또 갔어요(undo)" → `ArchiveEntry/ArchiveVisit`; Cube 방문은 `Record`(12시간 재방문, A) | A+B | CURRENT |
| Archive(내 공간) | `/archive`(+`/archive/p/[key]`, `/saved`, `/all`, `/following`) | A(구조)→B(재편) | CURRENT. `/archive/taste`, `/archive/taste/all`은 에디토리얼 모드에서 `/find`로 리다이렉트 → **LEGACY** |
| Archive Map | `/archive?mode=map`, `libraryMap.ts` | B | CURRENT (Partner만 좌표 보유) |
| Recommendation | HOME 개인화 선반 + `/find` 정렬(`spaceFinder.ts`, `discoveryRecommend.ts`); `/recommend`→`/find` 리다이렉트; `/recommendation`(설명 페이지) 비링크 | A→B | CURRENT(HOME/FIND) / `/recommendation` LEGACY |
| People 기반 발견 | `/find?tab=people`, HOME "취향이 비슷한 사람", `/u/[handle]`(`/@handle` rewrite), 따라가기 | B | CURRENT. `ENABLE_SIMILAR_TASTE_PEOPLE_UI=false`는 옛 `/taste/[userId]` 쪽 UI |
| CURATION | `/curation`, `/curation/[slug]` | B | CURRENT (공개 6, **샘플 본문**) |
| PEOPLE | `/story?type=people`, `/story/[slug]`; `/people`→리다이렉트 | B | CURRENT (공개 3, 샘플) |
| THOUGHT / STORY | `/story`, `/thought`→리다이렉트 | B | CURRENT (공개 3, 샘플) |
| 옛 STORY(ContentStory) | `/stories`, `ENABLE_REGION_STORIES/TASTE_STORIES=false` | A(초기) | LEGACY/HIDDEN |
| Partner Space | `cubeAvailable` 표시, Partner 마크, 상세 내 Episode 영역(`PartnerEpisodeList`), `/spacecube`·`/cube-spaces`(메뉴 "공간큐브") | B | CURRENT |
| Cube QR | `/c/[code]` → `/api/cube-entry/[code]` | A | CURRENT (9/7 이후 변경 커밋 없음) |
| Episode / Scene | `/space/[slug]/episodes/[id]`; Reading Progress(연속 바)로 교체(9/18→10/5) | A | CURRENT |
| Record | `/space/[slug]/record`, `POST /api/records` | A | CURRENT. 첫 방문 흐름에서는 방명록 진입 시 서버가 최소 Record 확보 |
| Guestbook | `/space/[slug]/guestbook`(+archive), 비로그인 가능(anonId) | A | CURRENT |
| 로그인 intent/callback | `safeRedirect.ts` + `pendingIntent.ts`(`sc_intent`) + 로그인 화면에서 상단 로그인 링크 숨김(callbackUrl 보존) | B | CURRENT |
| 공간 둘러보기 `/discover` | `ENABLE_PUBLIC_SPACE_BROWSER=false` → `/`로 리다이렉트 | A(초기) | HIDDEN/LEGACY |
| 큐레이터 | `/curators`, `/collections/[slug]`, `/archive/p` 일부 | B | PROTOTYPE/HIDDEN (flag off, 관리자/dev만) |
| 운영자 PIN | `/operator/[slug]/*` | A | CURRENT (9/7 이후 변경 거의 없음) |
| 관리자 | `/admin` Overview, CONTENT(`/admin/content/*`), CUBE OPERATION(`/admin/spaces`, `[id]/*`, `cubes`), `/admin/reports`, `/admin/demo-data`, `/admin/districts`, `/admin/tags`, `/admin/spaces/map`(Kakao) | A+B | INTERNAL |
| 다국어·자동이메일·방명록 사진/댓글/알림·AI 해설 | `pilotFlags.ts` 전부 기본 false | A | HIDDEN |
| 손글씨 PoC | `ENABLE_HANDWRITING_POC` | A | PROTOTYPE/INTERNAL |
| 미리보기 | `/preview/editorial` | B | INTERNAL |
| `/owner/*` | `/admin/*`로 리다이렉트 | A | REMOVED(경로) |
| 원래 있던 "Original 분리 허브" | 10/3 도입 후 10/3 되돌림(`1845b1a`→`bcd56b3`) | B | REMOVED |

---

## 2. 9/7 이후 Git 변경 이력 (기능 단위)

총 113 커밋(9/13~10/21), 479 파일 +35,224/−2,949. 작성자: 89 MINDONGDA / 14 minminda(PR #1~#4 병합) / 10 Claude. 개발 집중: 10/3~10/6, 10/11~10/12.

각 항목: 기간 · 주요 커밋 · 전 → 후 · 이유 · 현재 사용 · 보고서 강조 가치(★ 높음/○ 보통/– 낮음).

1. **첫 방문 핵심 흐름 단순화** — 9/13 · `a0a1808` `b0f5782` `638469f` · 전: Story→로그인→취향점수→방명록 / 후: Story→방명록 직행, 로그인 사용자는 서버가 최소 Record 자동 확보, 완료 페이지 축소 · 이유: 첫 방문 이탈(퍼널 진단 결과) · 사용 중 · ★ (`[구현 vs 운영]`: 1차의 로그인/취향점수 게이트는 구현 성과, 운영 경로에서만 제거)
2. **비로그인 Guestbook** — 9/13, 9/22 · `a0a1808` `67a8ba2` · 전: userId 필수 / 후: `GuestbookNote/Reaction/Comment.userId` nullable + `anonId`(sc_anon_id), 방문당 1개 unique, 작성자 수정·삭제 anonId 소유권, 댓글 API에서 원시 anonId 비노출 · 사용 중 · ★
3. **Story Complete / Reading Progress / KPI 개선** — 9/16~9/22 · `7c6a497` `54bf9e7` `faabf28` `704f156` `6fb6439` · 전: 완독 이벤트 유실(앱 내부 이동 시 pagehide 미발생), 최하단 기준 / 후: 언마운트 시 전송, 마지막 Scene 본문 도달 기준, `SceneReach` 신규, Story Depth, 핵심 7단계 퍼널(QR Entry→Story View→Story Complete→Guestbook Viewed→Write Attempt→Post-it→Experience Complete), 익명 조회 동시성 500 수정 · 10/5에 Scene별 5분할 바 → STORY·CURATION과 같은 연속 바(`57d8891`) · 사용 중 · ★
4. **Editorial / Discovery 구조 도입** — 9/30~10/1 · `f965e96` `67c56fb` `b9cd4ae` `6c78165` `adf2d94` `c3a1485` · 전: 공개 홈 = 옛 홈 / 후: 에디토리얼 홈(LATEST·CURATION·PEOPLE·SPACE 스트림), 공개 `/spaces`, Partner 마크 · 이유: 방문 후 경험만으로는 첫 접점이 부족 · 사용 중 · ★
5. **Cube 운영 Space와 공개 Editorial Space 분리** — 9/30 · `67c56fb` `b2ae5b4` · 전: 공개 목록이 운영 `Space` 직접 조회 / 후: `EditorialSpace` 독립, `/spaces/*`(공개) vs `/space/*`(Cube 전용), 연결은 slug · 사용 중 · ★
6. **Editorial CMS** — 9/30~10/4 · `582cfec` `74d11d8` `fc2514c` `b27f8a1` · 모델 6개+, 블록 9종 에디터, 상태/단계 파이프라인, 백로그·빠른 아이디어, 실시간 미리보기(iframe DESKTOP/MOBILE), 보관 우선 삭제, seed는 최초 이관 전용(`b2ae5b4`) · 사용 중(INTERNAL) · ★
7. **HOME Discovery Hub** — 10/11 · `a6f6b25` `c0f0079` `932d83d` `ea71f6d` `4d1ec8c` `f36c03a` · Hero·지역 선택·가로 선반·개인화, 선반 진단·테마↔태그 연결 관리, 선반 간 중복 노출 완화 · 사용 중 · ★
8. **Search / Region / Theme** — 10/11 · `c0f0079` `55c7a77` `a49b0b9` · `/search` 점수 함수, 관심 지역(`SavedRegion` + 비로그인 쿠키 `sc_regions`), District CRUD·태그 정본(Category/Tag) 연동, 검색 말뭉치 30초 캐시 · 사용 중 · ★
9. **Save 데이터 통합** — 10/3, 10/11 · `aca77d7` `4948267` · 전: `SavedSpace`(Cube 상세) 단독 / 후: `SavedEditorialSpace` 추가, 화면에서 slug로 합침(저장 해제 시 양쪽 해제) · 사용 중 · ○
10. **Archive 구조 변화** — 10/3~10/5 · `07c8887` `aca77d7` `3e29a18` `7247246` · 전: Record 기반 4탭 노트 / 후: 방문·저장·흔적, `ArchiveEntry/Visit/Photo`(사진·링크·이름, 기존 공간 자동 매칭, 방문 여러 번), 공개 프로필 `/@handle`(`ProfileSpace`, 기본 공개) · "내 아카이브"→"내 공간"(UI 문구만) · 사용 중 · ★
11. **Archive Map** — 10/12 · `726e024` · 저장/다녀온/재방문 마커, 새 저장소 없음 · 사용 중 · ★ (좌표는 운영 Space 한정)
12. **Visit / Revisit** — 10/12 · `8ff965a` `ffdd771` · 상세 "다녀왔어요→또 갔어요→✓ 토글(방금 재방문 1건만 취소, 24시간 상한)" · 사용 중 · ○. Cube 재방문 12시간 정책(`visit.ts`)은 1차 그대로.
13. **Recommendation 현재 구조** — 10/3~10/11 · `bcd56b3` `fa4e7a1` `c0f0079` · "찾기 자체가 추천"(지역 Pool→필터→개인 정렬)→HOME 개인화로 흡수. 점수 0 공간 제외, 이유 문구는 실제 겹친 속성만, AI·임의 점수 없음 · 사용 중 · ★
14. **People 기반 발견** — 10/4~10/11 · `8017e62` `cdc9a80` `4e3b656` `6091969` `ea2a427` `c09abf4` `6e4ffb3` · 사람 추천(`rankPeople`: 같은 공간 방문 +3 / 같은 공간 +2 / 결 겹침 +0~2), 벡터 아바타, `@handle` 검색, 취향 따라가기(`SavedTaste` 재사용), 추천/검색 응답에서 내부 id 제거(`e6a7ac5`) · 사용 중 · ○~★
15. **Discovery Event** — 10/11 · `25ebb6a` · `DiscoveryEvent`(SPACE_VIEW/MAP_CLICK), 30분 내 중복 무시, 관리자·비발행·demo 제외 · 사용 중 · ★
16. **Map Click → QR Scan 전환** — 10/11 · `25ebb6a` · §5 상세 · 코드 사용 중 / **데이터 0건** · ★
17. **Admin CONTENT / CUBE OPERATION 분리** — 9/30, 10/11 · `4802229` `afe3ac5` `55c7a77` `193cb84` `4113f7c` `532a131` · 사이드바 AdminShell, Overview, 지역·태그·선반 관리, Kakao 지도 기반 공간 좌표(`District.lat/lng`, `Space.lat/lng`) · 사용 중(INTERNAL) · ○
18. **성능 개선(N+1 / Search Cache)** — 10/11 · `a49b0b9` · HOME 209→28, /find 152→27 쿼리(결과 동일, 커밋 메시지 기준), 검색 말뭉치 30초 캐시+저장 시 무효화 · 사용 중 · ○ (재측정은 안 함)
19. **Space Detail Desktop Overlay** — 10/11~10/12 · `8993c30` `afba7ba` `043c162` `86447ce` `d04ff89` · `@modal` 가로채기 창, 새로고침 시 `sc_modal` 단발 쿠키로 같은 창 복원, X 화면 고정 · 사용 중 · ○
20. **로그인 후 Save / Visit 자동 완료** — 10/12 · `ffdd771` · `pendingIntent.ts` 일회용 nonce+30분, 주소만으로 실행 불가 · 사용 중 · ○
21. **일반 문화공간 Bulk Import** — 10/21 · `115d3ce` · `bulk-import-spaces.ts` 기본 Dry-run, §6 · **미실행** · ○ (보고서에는 "준비된 확장 경로")
22. (추가) **데모 데이터 비파괴 제외 정책** — 10/3 · `91f66d8` · `Space.isDemo`/`User.isDemo` (60개 더미 계정 표시), 관리자 `/admin/demo-data`, KPI·추천·목록에서 제외 · 사용 중 · ○
23. (추가) **보안/안정 수정** — 9/22 · `7e91efb` 타인 아카이브 메모·감정태그 무인증 노출 차단, `631d923` 비운영 환경 운영 DB 접속 경고 · ○
24. (추가) **방명록 샘플** — 10/5~10/6 · `57d8891` `2a7ae68` `005abd0` 외 · 전용 더미 계정이 쓴 표시 없는 샘플 포스트잇(Vercel production 배포 시 자동 동기화, KPI·추천·공개 프로필 제외) · 사용 중 · – (정직성 이슈: 보고서에서 "샘플 포함" 명시 권장)
25. (제외) 큐레이터 프로토타입 — 10/3 · `8980f51` — PROTOTYPE, 보고서 비강조.
26. (제외) 문서/CI — AI 협업 워크플로 문서·`claude-task-dispatch.yml`(10/5).

---

## 3. DB / ERD 변경 (스키마 실측)

9c1e3b8 대비: 모델 **44 → 65 (+21, 삭제 0)**. 기존 모델 변경은 모두 additive.

### 3.1 분류
**기존 핵심 모델 (A, 유지)** — User, Account, Session, VerificationToken, Space, SpaceTranslation, Cube, SpaceScan, SpaceUnlock, Record, RecordTag, Episode, Scene, SceneImage, EpisodeTranslation, SceneTranslation, EpisodeRead, GuestbookSession/Note/Reaction/Comment/Settings, Notification, GuestbookFunnelEvent, SpaceKPI, SpaceMonthlyReport, MonthlyReportFeaturedPost, OperatorMonthlyNote, Category, Tag, SpaceTag, District, SavedSpace, SavedTaste, Interview*(3), 외 (Collection/CollectionItem/ContentStory/ContentStorySpace/SpaceNote/WaitlistEntry/Material).

**9/7 이후 추가 (+21)**
| 계층 | 모델 |
|---|---|
| Editorial / Discovery | `EditorialSpace`, `EditorialCuration`, `EditorialCurationSpace`, `EditorialPerson`, `EditorialPersonSpace`, `EditorialThought`, `EditorialThoughtSpace`, `HomeShelf`, `HomeShelfSpace`, `EditorialHomeSettings`(미사용) |
| Archive / Save / Visit | `ArchiveEntry`, `ArchiveVisit`, `ArchivePhoto`, `SavedEditorialSpace`, `SavedRegion` |
| People / Profile | `ProfileSpace` (+ `User.profilePublic/profileHandle/profileBio/…`) |
| Curator(프로토타입) | `CuratorProfile`, `CuratorCollection`, `CuratorCollectionSpace` |
| KPI / Event | `DiscoveryEvent`(+enum `DiscoveryEventType`), `SceneReach` |

**9/7 이후 의미가 바뀐 기존 모델**
- `GuestbookNote/Reaction/Comment`: `userId` nullable + `anonId`(+ unique `[anonId, guestbookSessionId]`, `[postId, anonId]`, `[guestbookSessionId, anonId]`)
- `GuestbookFunnelStep` enum: `WRITE_ATTEMPT`, `GUESTBOOK_VIEWED`, `EXPERIENCE_COMPLETE` 의미 확장(첫 방문 단순화 이후 모든 방문자 공통)
- `Space.isDemo`, `User.isDemo` 추가(제외 정책)
- `District.lat/lng` 추가(Kakao 지도)
- `SavedTaste` 의미 확장("취향 따라가기")
- `TagKey` enum 주석만 변경

**사용하지 않거나 Legacy 성격**: `EditorialHomeSettings`(미사용 유지), `ContentStory/ContentStorySpace`(flag off), `Collection/CollectionItem`(옛 컬렉션, 큐레이터 `CuratorCollection`과 별개), `Notification/GuestbookComment`(flag off), `SpaceTranslation/EpisodeTranslation/SceneTranslation`(다국어 off), `WaitlistEntry`, `RecordTag`(`ENABLE_RECORD_TAG_SELECTION=false`), `Curator*`(프로토타입), `Material`(독립 자료실).

### 3.2 계층별 정리
| 계층 | 모델 |
|---|---|
| Cube 운영 | Space, Cube, SpaceScan, SpaceUnlock, Episode, Scene(+Image/Reach), EpisodeRead, Record, Guestbook*, Operator*, SpaceKPI, SpaceMonthlyReport |
| Editorial / Discovery | EditorialSpace/Curation/Person/Thought(+연결 3), HomeShelf(+Space), District, Category/Tag |
| Archive / Save / Visit | ArchiveEntry/Visit/Photo, SavedEditorialSpace, SavedSpace, SavedRegion, Record(Cube 방문) |
| Recommendation | 전용 테이블 **없음** — SpaceTag.weight, Record, ArchiveEntry.tags, 저장 테이블을 순수 함수로 계산 |
| People / Profile | User.profile*, ProfileSpace, SavedTaste(따라가기), (CuratorProfile 프로토타입) |
| KPI / Event | DiscoveryEvent, SceneReach, EpisodeRead, SpaceScan, GuestbookFunnelEvent, SpaceKPI |

### 3.3 최종 ERD·테이블 정의서에 **반드시 추가할 모델 (우선순위)**
필수: `EditorialSpace`, `EditorialCuration`(+`EditorialCurationSpace`), `EditorialPerson`/`EditorialThought`(+연결), `SavedEditorialSpace`, `ArchiveEntry`, `ArchiveVisit`, `ArchivePhoto`, `SavedRegion`, `ProfileSpace`, `HomeShelf`/`HomeShelfSpace`, `DiscoveryEvent`, `SceneReach`.
조건부: `Curator*`는 프로토타입 각주 처리, `EditorialHomeSettings`는 제외(미사용).
논리 연결(점선) 표기 필수: `EditorialSpace.slug ≡ Space.slug`(Partner 한정).

---

## 4. 현재 KPI 정의 (코드 기준) — Journey별

식별: 로그인 = `userId`, 비로그인 = `anonId`(쿠키 `sc_anon_id`, 12시간 갱신), 고유 방문자 = `visitorIdentity`(userId 우선)·`distinctVisitorCount`(`reportMetrics.ts`).
제외: 관리자(`ADMIN_EMAIL` → `kpiEligibility.ts`) ∪ `User.isDemo` 계정(`getKpiExcludedUserIds`), 공간 `isDemo`·비발행. 익명 행은 JS에서 거름(NULL NOT IN 함정 회피).

| 단계 | 모델/이벤트 | 비고 |
|---|---|---|
| Content / HOME | **계측 없음** (HOME·CURATION·STORY 조회 이벤트 모델 없음) | 갭 |
| Space Detail | `DiscoveryEvent.SPACE_VIEW` (`DiscoveryTracker`) | 30분 내 중복 무시(쓰기 시), 집계는 고유 방문자 |
| Save | `SavedEditorialSpace.createdAt` + `SavedSpace.createdAt` (이벤트 신규 없음) | 로그인 전용, 저장 후 취소한 건은 남지 않음 |
| Map Click | `DiscoveryEvent.MAP_CLICK` (`MapLink`, keepalive fetch) | 현재 0건 |
| QR Scan | `SpaceScan` (로그인→userId만, 비로그인→anonId만) | 운영 Space 단위 |
| Story View | `EpisodeRead.openedAt` (user/anon 이중 unique) | |
| Story Complete | `EpisodeRead.completedAt` — 마지막 Scene 본문 도달 | `StoryReadTracker`, 언마운트 시도 전송 |
| Record | `Record`(visitedAt) | 공간 `isDemo=false` |
| Guestbook | `GuestbookFunnelEvent`(ENTRY_ATTEMPT·WRITE_ATTEMPT·GUESTBOOK_VIEWED·EXPERIENCE_COMPLETE·LOGIN_*), `GuestbookNote`(Post-it) | 핵심 7단계 + 접이식 9단계 진단 |

**Map Click → QR 전환 계산** (`discoveryKpi.ts` `countMapClickConversions`):
- 모수: (방문자 × 공간) 쌍. 같은 쌍의 클릭이 여러 번이어도 1.
- 전환: 클릭 시각 이후 **7일(`MAP_TO_SCAN_WINDOW_MS`) 이내** 같은 공간의 `SpaceScan`이 있고, `userId` 또는 `anonId` 중 하나가 일치.
- 공간 매칭: `EditorialSpace.slug` ↔ `Space.slug`.
- 한계: ① 클릭 이벤트가 anonId를 갖지만 SpaceScan이 anon 쿠키를 같은 값으로 쓰는지는 기기·12시간 갱신에 의존(쿠키 만료 시 이어붙이기 실패 가능) ② 현재 데이터 0 ③ 일반(비Partner) 공간은 QR이 없어 전환 분모에 포함되지 않음(`mapClickVisitors`는 매칭 가능한 쌍 기준). 서비스 전체 현장 퍼널은 `getServiceOnsiteStats`(QR·Story View·Complete·Record 고유 인원).
화면: `components/admin/kpi/DiscoveryKpi.tsx`, `/admin/reports`, `/admin/[id]/report`. 기간 조회·시간별(KST)·월간 리포트는 9/7 이전 구현 그대로.

---

## 5. 운영 데이터 · 콘텐츠 병목 (운영 DB 읽기 전용, 2026-10-24)

| 항목 | 값 |
|---|---|
| EditorialSpace 총 | 29 (PUBLISHED 29) |
| **실제 공개** (PUBLISHED & !isDemo) | **6** — 전부 Partner(cubeAvailable) |
| 가상(isDemo) | 23 (공개 비노출) |
| 일반(비Partner) 실제 공개 | **0** |
| 실제 공간 중 태그 없음 | **6/6** |
| 지역 분포 | 연남동 3 · 망원동 2 · 용인 처인구 1 |
| 유형 분포 | 복합문화공간 2 · 독립서점 / 카페 / LP카페 / 촬영장비 각 1 |
| 운영 Space | 20 (실제 6 · 전부 활성·Cube GC-001~006 ASSIGNED·좌표 있음·Episode 1×Scene 5) · 시연/비활성 14(그중 `buk`=GC-010 활성 시연 공간, Episode 2) |
| District | 3 (망원동·연남동·용인 처인구, 좌표 있음) · 활성 Tag 33 · HomeShelf 0 |
| 콘텐츠 공개 | CURATION 6 · PEOPLE 3 · THOUGHT 3 (모두 샘플 본문) |
| 사용자 | User 79 (isDemo 60) · Record 164 · SpaceScan 443 · EpisodeRead 132 · 방명록 165 · ArchiveEntry 41 · SavedEditorialSpace 1 · SavedSpace 11 · ProfileSpace 31 · SavedTaste 3 |
| DiscoveryEvent | 14 (SPACE_VIEW 14 / MAP_CLICK 0) |

Partner 6곳 현장 데이터(Space.\_count): aka-coffee-room scan 83·rec 20·gb 18 / booknook-yeonnam 50·19·16 / nokhwabutton 34·13·16 / inner-discovery 28·9·17 / dasijeom 18·10·15 / turndown-service 11·8·15. (더미·샘플 포함 가능 — KPI 필터 적용 전 원시 카운트)

**후보 부족 판단 (코드 조건 × 현재 데이터)**
- 새 소개 선반: 가능(6곳).
- 지역 선반: 지역당 3곳↑ → **연남동만 충족**(망원 2, 용인 1).
- 유형 선반: 같은 유형 2곳↑ → 복합문화공간만.
- 테마 선반: 태그 0 → 유형·이름 키워드가 맞는 3곳↑ 필요(`themeRules.ts`; 소개문장은 안 봄) → 사실상 **0개**.
- 검색: 이름·지역·유형으로는 동작, 태그 매칭 없음. 추천: 태그 기반 점수 0이면 추천 제외 → 신규 사용자는 큐레이션 순 기본 정렬뿐.
- 다양성(`diversifyShelves`)은 후보가 24곳일 때 효과가 테스트로 확인됨(`diversity.test.ts`), 6곳에선 반복 노출.

### 5.1 `bulk-import-spaces.ts` 구조·안전장치 검토 (미실행)
- 순수 계획 함수(`bulkSpaceImport.ts`) + IO 스크립트 분리, **기본 Dry-run**, `--apply`는 DRAFT, `--apply --publish`만 공개.
- 새 `EditorialSpace` 행 생성만(`create`), 기존 수정·삭제 없음, `cubeAvailable=false`, `story=[]`, 허용 필드 외 입력은 오류, 필드 검증은 관리자 저장과 동일 `parseSpaceInput`.
- 정본 강제: 지역=District+기존 area, 유형/태그=활성 Tag(+기존). 정본 밖 → 오류(`--allow-new`면 유형·태그만 경고, 지역은 항상 오류). 태그 3~5개 필수.
- 중복: 파일 내·DB(초안·보관·가상 포함) slug/이름, 같은 slug+이름은 skip(재실행 안전), 오류 1건이라도 있으면 전체 미기록. 실행 첫 줄에 DB host 출력.
- `fictional:true` → `isDemo`, `--publish`여도 DRAFT.
- 이미지: https URL 또는 로컬(Cloudinary unsigned 업로드, 10MB 제한).
- **구조적 한계(검토 의견)**: ① 트랜잭션 없이 항목별 create(중간 실패 시 부분 등록 — 재실행으로 복구 가능한 설계) ② 좌표 필드 없음 → 내 공간 지도 미표시 ③ 운영 DB와 시연 DB가 `DATABASE_URL`만 다름(현재 운영 DB에 직접 연결 — 로컬에서도 마찬가지) ④ 신규 지역은 District 선등록 필요.
- 안전 판단: 구조상 파괴적 동작 없음. 적용은 DRAFT→사람 검수→공개 순서를 권장.

---

## 6. 졸업전시 Golden Path (11/4) — 현재 구현 기준

| 단계 | 가능 여부 (코드 근거) | 로그인 | 비고 / 수동 QA |
|---|---|---|---|
| 1. HOME / CURATION | 가능. 샘플 본문 CURATION 6개 공개 | 불필요 | 샘플 본문 구분 방침 결정, 선반이 빈약한 점(§5) |
| 2. Space 발견 | 가능(Hero·새 소개·`cube` 선반, 검색 `/search`) | 불필요 | 6곳만 노출 → 같은 공간 반복 |
| 3. Space 상세 | 가능. 데스크톱 창 / 모바일 페이지, 운영시간·지도·Partner Episode 영역 | 불필요 | 데스크톱 창 새로고침 복원 QA |
| 4. 저장 | 가능 `POST /api/saves/spaces/[id]` | 필요(비로그인은 로그인 후 자동 완료) | 로그인→복귀→저장 완료 실기기 QA |
| 5. 내 공간 | 가능 `/archive` | 필요 | 저장 반영 확인 |
| 6. 지도/방문 정보 | 가능(Partner는 좌표 있음) `/archive?mode=map`, 상세 "지도에서 보기" | 지도 필요, 보기 불필요 | **MAP_CLICK 기록 실제 동작 QA(비관리자 계정)** |
| 7. Partner 실제 방문 | 현장 의존 | — | 전시장에서는 실제 방문 불가 → 시연용 QR 필요 |
| 8. QR | `/c/GC-xxx` → 대표/첫 Episode (코드 9/7 이후 무변경) | 불필요 | 시연용: 활성 시연 공간 `buk`(GC-010, isDemo=true: 목록엔 안 나오나 QR·직접 링크 동작) 또는 Partner GC-001 스티커 |
| 9. Episode | 가능. 5 Scene, 연속 진행바 | 불필요 | 12시간 쿠키 만료 주의 |
| 10. Record / Guestbook | 가능. 방명록은 비로그인 가능, 로그인 시 서버가 Record 확보 | 선택 | 작성→완료 화면 QA |

권장 Partner 후보: **`aka-coffee-room`**(GC-001, 활동 최다), 보조 `booknook-yeonnam`. 단 aka-coffee-room은 지역이 용인 처인구라 연남/망원 중심 서사와 어긋남 → 연남 서사를 쓰려면 `booknook-yeonnam`. (시연 계정은 관리자가 아닌 일반 계정이어야 KPI에 기록됨)

**전시 전 필수 수동 QA 체크리스트**: 배포본 URL에서 위 10단계 1회 통주행(모바일 실기기+데스크톱), 비관리자 계정 MAP_CLICK→QR 후 `/admin/reports` Discovery KPI 수치 반영 확인, 샘플 콘텐츠/방명록 샘플 노출 방침 확정.

---

## 7. Final Submission Gap (10/30 기준)

**P0 — 제출 전 필수**
1. 실제 6곳 태그 입력(콘텐츠 작업) → 테마 선반·추천 근거 확보.
2. 일반 문화공간 최소 12~18곳 확보(연남·망원 각 3곳↑) 또는 "6곳 파일럿" 범위를 보고서에 명시. 등록 시 DRAFT→검수→공개.
3. MAP_CLICK 계측 실동작 검증과 최소 실측 수치 확보(없으면 "계측 구조 구현, 수집 개시" 서술).
4. 기능 동결 후 `tsc` + 전체 `vitest run`(87 파일) + `build` 1회, 배포본 Golden Path 통주행.
5. 보고서·설계서 ↔ 코드 정합: §0의 세 층 구분 반영, §3 모델 수(65)·테이블 정의서 반영, 충돌 표(요약 7) 정리.

**P1 — 완성도 향상**
- 샘플 STORY/CURATION을 실제 콘텐츠로 교체 또는 보고서·화면에서 샘플임을 명시.
- 일반 공간의 지도 좌표 방안(EditorialSpace에 좌표 없음) 결정 — 스키마 변경 없이 시연하려면 Partner 한정.
- HOME 조회 계측 부재를 갭으로 인지(추가 개발 대신 보고서에 한계로 기재).
- 문서 최신화: `PRODUCT_DECISIONS`/`PROJECT_CONTEXT` 큐레이터·/find 서술, `guestbookFunnel.ts` 상단 주석, 스키마 Editorial 주석(FK 없음 vs slug 조인).
- 방명록 샘플·더미 사용자 60명 제외 정책을 "정직한 데이터 관리 사례"로 서술.
- 시연 영상: 9월 QR 이후 영상 유지, Discovery는 별도 화면 캡처/짧은 영상 보충.

**P2 — 10/30 이후**
큐레이터/SNS 기능 활성화, Instagram 가져오기, 추천 고도화(협업 필터링 등), 다국어·자동 이메일·알림 재활성, 일반 공간 좌표 모델링, HOME/CURATION 조회 계측, `EditorialHomeSettings` 정리.

---

## 8. 개발보고서 Delta (9/7 → 최종)

| 항목 | 처리 | 내용 |
|---|---|---|
| 프로젝트 소개 | 문구 수정 + 내용 추가 | "방문 후 경험 서비스"에 "QR 이전 온라인 공간 발견(Discovery)"을 확장 층으로 병기. 기존 QR 이후 정의 유지 |
| 개발 배경 및 필요성 | 내용 추가 | "방문 전 발견 → 방문 후 기록"의 단절, 첫 방문 이탈 퍼널 진단(9/13 단순화 근거) 추가 |
| 특·장점 | 내용 추가 | Editorial↔Cube 분리, 설명 가능한 추천, Discovery→QR 전환 KPI, 비파괴 데모 제외 |
| 전체 서비스 구성 | 내용 추가 | Discovery 계층(HOME·검색·내 공간) + 기존 현장 계층 + 관리자(CONTENT/CUBE OPERATION) |
| 전체 기능 목록 | 9/7 내용 유지 + 추가 | 기존 목록 유지, Discovery 기능 블록 추가. 비활성(flag off) 기능은 "구현·미활성" 표기 |
| 주요 S/W 기능 | 내용 추가 | 상세 창, 저장/다녀왔어요, 내 공간 지도, CMS, 선반 |
| 적용 알고리즘/기술 | 내용 추가 + 일부 문구 수정 | 추가: 검색 점수, 태그 이름 매칭 추천, 사람 추천 규칙, 다양성 재배치, 지도 상태 계산, anonId 이중 식별, nonce 의도 보존. 수정: "취향점수 기반 추천"은 1차 구현으로 유지하되 운영 추천은 행동 강도 기반이라 병기 |
| 개발 환경 | 문구 수정 | Next 16.1.6·React 19·Prisma 5.22·Neon·Vercel·Cloudinary·NextAuth beta·Kakao Local/Maps(관리자) — `package.json` 재확인 후 확정. 모델 65, 테스트 87 파일 |
| 추진 과정의 문제와 해결 | 내용 추가 | 파일럿 피드백→첫 방문 단순화, 홈 정체성 재설계(10/1→10/3 IA 두 차례 되돌림 포함), 콘텐츠 병목 |
| 기술적 문제와 해결 | 내용 추가 | Story Complete 유실, anonId 소유권/노출, NULL NOT IN 집계 누락, 익명 조회 P2002 경쟁, N+1, 새로고침 시 모달 복원, 운영 DB 오접속, 타인 아카이브 개인정보 노출 |
| 배운 점 | 내용 추가 | 계측 먼저, 비파괴 데이터 정책, 계층 분리 |
| 기대 효과 | 문구 수정 | Discovery→방문 전환 측정 가능, 콘텐츠 확장성(일괄 등록) — 실측치가 없으므로 "구조 구현"으로 서술 |
| (삭제·교체) | 해당 없음 | 9/7 성과 삭제 대상 없음. 교체가 필요한 것은 "방명록 진입=로그인+취향점수" 서술(운영 경로 기준 각주 병기) |

## 9. 제작설계서 Delta (최소 변경)

| 항목 | 변경 필요 | 내용 |
|---|---|---|
| 요구사항 정의서 | 보충 | Discovery 요구(발견·저장·방문·내 공간·지도·KPI·CMS) 행 추가 |
| 유스케이스 | 보충 | 액터 "비로그인 탐색자" 추가, UC: 공간 탐색/저장/방문 표시/지도 열기/콘텐츠 발행 |
| 서비스 시나리오 | 보충 | Discovery→QR 연결 시나리오 1개 추가 |
| 서비스 흐름도 | 보충 | 앞단 Discovery 흐름 추가(§요약 2 Journey) |
| 메뉴 구성도 | 추가 | HOME·검색·내 공간·메뉴(CURATION/STORY/지역/테마/설정). 관리자: CONTENT / CUBE OPERATION / SYSTEM |
| 화면 설계 | 보충 | HOME, 검색, 공간 상세(창/페이지), 내 공간+지도, 관리자 CMS |
| ERD | **보조 도면 추가** | 기존 ERD 유지 + Discovery 계층 도면, slug 논리 연결 점선 |
| 기능 처리도 | 보충 | 저장 토글, 다녀왔어요/또 갔어요/취소, MAP_CLICK 기록, 의도 재개, 전환 계산 |
| 알고리즘 명세 | 보충 | 검색 점수, discoveryRecommend 가중치, rankPeople, diversifyShelves, countMapClickConversions |
| 프로그램 목록 | 추가 | `src/lib/{home,editorial,finder,search,archive,people,profile,regions}`, `discoveryKpi.ts`, 라우트 §1 |
| 테이블 정의서 | 추가 | §3.3 필수 모델 |
| 핵심 소스코드 예시 | 선택 추가 | `countMapClickConversions`, `pendingIntent.matchPendingIntent` (짧고 순수 함수) |
| 개발 환경 | 문구 수정 | 보고서와 동일 |
| S/W 실사 화면 | 추가 | Discovery 화면 캡처(HOME·검색·상세·내 공간·지도·관리자 CMS·Discovery KPI). QR 이후 화면·영상은 9월 것 유지 |

## 10. 최종 검증 상태

| 항목 | 값 |
|---|---|
| HEAD / branch | `115d3ce` / `master` (origin/master와 동일, ahead/behind 0) |
| git status | 수정 `.claude/settings.local.json`, 미추적 `.claude/launch.json`, `docs/contest-2026-technical-reference.md`(미추적 문서) + 이 감사 문서 |
| 최근 배포 기준 commit | 확인 불가(Vercel 상태는 코드로 확인 못 함). push 기준 최신은 `115d3ce` |
| 테스트 구조 | Vitest 4, `npm test` = `vitest run`, 테스트 파일 87개(`src/**`), `.env.test` 없으면 DB 접촉 테스트 위험 주의(631d923 경고 추가) |
| 마지막 전체 test 통과 시점 | **저장소에 기록 없음**(미확인). HANDOFF는 부분 범위만 기재 |
| 마지막 build 통과 시점 | 기록 없음. 로컬 `.next/BUILD_ID` 2026-10-11 12:23 |
| HANDOFF "136 tests" | 전체가 아니라 `src/lib/{home,editorial}` 범위 |
| 이번 세션 | 코드 변경 없음, 전체 test/build 미실행(지시에 따름). 운영 DB는 읽기 조회만 |

미확인 사항(추측 금지): 현재 Vercel 배포 상태, 전체 vitest 통과 여부, 실기기 Golden Path 동작, 성능 개선 수치의 재현, 9/7 보고서 원문 내용(사용자 제공 요약만 근거로 비교).
