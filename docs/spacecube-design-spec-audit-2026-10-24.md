# 제작설계서 현행화 사전 분석 (2026-10-24)

> 분석 전용. 코드·DB·UI 변경 없음, 운영 DB 미조회, 테스트·빌드 미실행, commit/push 없음.
> 기준: `master` HEAD `62240f2`(2026-10-24). 근거는 `prisma/schema.prisma`, `src/**`, `package.json`, `next.config.ts`, 기존 문서와 `제작설계서_1024.pptx`.
> 일부 항목은 이전 감사 문서([final-submission-audit-2026-10-24.md](final-submission-audit-2026-10-24.md), HEAD `115d3ce` 기준)의 서술을 가져왔다. 그 항목은 **(이전 감사 인용)** 으로 표시했고 이번에 코드로 재확인한 것과 구분했다.
> 표기: **검증 필요** = 이번 분석에서 확인하지 못함.

## 0. 분석 범위와 한계

| 항목 | 상태 |
|---|---|
| `제작설계서_1024.pptx` 39장 | 슬라이드 본문이 **이미지**(슬라이드당 1장)다. 텍스트 추출은 표지·산출물표(2장)·제목뿐이다. 본문을 직접 본 슬라이드는 6·7(요구사항), 15(기능 목록), 23(ERD), 26·27(알고리즘), 29(프로그램 목록, 이미지29), 30(테이블 정의서), 32(개발환경)다. 이 중 실제 슬라이드 번호 대응은 추정(이미지 N+1=슬라이드 N)이며, **나머지 슬라이드의 세부 내용은 검증하지 않았다.** |
| 표지 | 프로젝트명 "공간큐브 : QR 지역 기반 소규모 문화공간 발견 서비스", 2026. 9. 7., 팀명 공간문화 |
| 운영 DB·Vercel 배포 상태 | 이번에 조회하지 않음. 운영 수치는 이전 감사 문서 인용이며 이후 데모 공간 추가로 바뀌었을 수 있다 → **검증 필요** |
| 전체 `tsc`/`vitest`/`build` | 실행하지 않음(지시). 테스트 파일 수는 `find` 기준 91개(`*.test.ts*`) |

---

## A. 현재 SpaceCube 서비스 전체 요약

### A.1 서비스 정의 (코드 기준)
공개 문화공간을 HOME·검색으로 발견하고 저장·"다녀왔어요"로 관리하다가, 공간큐브 Partner 공간에서는 QR Cube로 운영자 이야기(Episode·Scene)와 방명록을 경험하는 웹서비스. 별도 앱 없음(Next.js 웹).

### A.2 사용자 여정 두 갈래
- **방문 후 경험(기존 핵심, 유지)**: 현장 QR Cube `/c/[code]` → `/api/cube-entry/[code]` → 대표 Episode → Scene → 방명록 → (완료) → 개인 아카이브 → 추천
- **방문 전 경험(9월 이후 확장)**: HOME·검색 → 공개 공간 상세 `/spaces/[slug]` → 저장 / 다녀왔어요 → 내 공간(`/archive`, 지도 모드) → 지도 보기(MAP_CLICK) → 현장 QR
- 두 갈래는 FK가 아니라 **slug 동일성**으로 이어진다: `EditorialSpace.slug` ≡ `Space.slug`(Partner). 근거: `src/lib/archive/library.ts` 상단 주석, `discoveryKpi.ts`.

### A.3 7개 기능과의 일치 검증

| # | 개발보고서 분류 | 실제 구현과 일치 여부 | 비고 |
|---|---|---|---|
| 1 | 콘텐츠 기반 문화공간 발견 | **일치** | HOME 선반·검색·CURATION/STORY·상세. 신규(9/30~) |
| 2 | 공간 저장 및 방문 상태 관리 | **일치** | `SavedEditorialSpace`/`SavedSpace`/`ArchiveEntry`·`ArchiveVisit`. 신규 |
| 3 | QR 기반 진입 및 Episode형 이야기 | **일치** | 9/7 이후 코드 변경 없음(이전 감사 인용) |
| 4 | 방문 기록 기반 취향 분석 및 추천 | **부분 불일치** | 아래 D.2 참고. 현재 운영 추천은 "방문 Record + 저장 + 아카이브" 행동 신호의 태그/유형 이름 매칭이다. "1~5점 취향 적합도" 방식은 **구현은 남아 있으나 운영 경로(HOME·FIND)에서 쓰이는 비중이 다르다** |
| 5 | 디지털 방명록 | **일치** (단, 비로그인 작성 가능으로 변경) | |
| 6 | 개인 공간 아카이브 | **일치** | 기존 기능이지만 구조가 "내 공간"으로 재편(저장·방문·지도). 신규 기능이 아님 |
| 7 | 사용자 행동 데이터 수집 및 분석 | **일치** | 방문 후 계측(기존) + 방문 전 `DiscoveryEvent`(신규) |
| H/W | QR Cube | **코드로는 QR↔식별자 연결까지만 확인** | 설계서 슬라이드 32의 "투명 아크릴 공간큐브" 재질은 코드로 검증 불가(보고서 사실 그대로 유지) |

---

## B. 9월 7일 이후 변경 사항

기준: 이전 감사는 9/6 `9c1e3b8`을 9/7 직전 마지막 커밋으로 둠. 이 저장소의 9/7 이후 커밋은 125개. 이번 분석에서 `git log`로 재확인.

### B.1 신규 추가
| 항목 | 근거 | 현재 상태 |
|---|---|---|
| 공개 공간 `EditorialSpace` 계층(Cube 없이 등록) | schema 1186, `src/lib/editorial/*` | CURRENT |
| HOME 발견 허브·선반(Shelf)·지역 선택 | `src/lib/home/*`, `EditorialHome.tsx` | CURRENT (`ENABLE_EDITORIAL_HOME=true`) |
| 검색 `/search` (점수 함수 `spaceSearch.ts`) | `src/lib/search/` | CURRENT |
| 공개 공간 상세 `/spaces/[slug]` + 데스크톱 `@modal` 창 | `src/app/spaces`, `@modal` | CURRENT |
| 저장 `POST/DELETE /api/saves/spaces/[spaceId]` | route.ts | CURRENT (로그인 필수) |
| 다녀왔어요/또 갔어요 = `ArchiveEntry`/`ArchiveVisit` | schema 1400~ | CURRENT |
| 내 공간(`/archive`) 지도 모드 | `libraryMap.ts` | CURRENT. 좌표는 운영 `Space.lat/lng`에서만 읽음(이전 감사 인용) |
| CURATION / STORY(PEOPLE·THOUGHT) CMS | `/admin/content/*` | INTERNAL |
| `DiscoveryEvent`(SPACE_VIEW, MAP_CLICK) | `api/discovery-events/route.ts` | CURRENT, 관리자·비발행·**isDemo=true 제외** |
| 로그인 후 의도 복원 `sc_intent` | `editorial/pendingIntent.ts` (nonce, TTL 30분) | CURRENT |
| 사람 추천·공개 프로필 `/@handle` | `people/rankPeople.ts`, `app/u/[handle]` | CURRENT |
| 시연 공간 `isDemo`+`demo-`/`demo-ext-` slug | `demoSpaces.ts`, `docs/extended-spaces-2026-10-24.md` | **일반 방문자에게 공개 중** (`ENABLE_PUBLIC_DEMO_SPACES=true`) |

### B.2 기존 기능 확장 (신규 아님)
- **Archive**: Record 기반 4탭(taste/saved/all/space) → ArchiveEntry·Record·저장을 slug로 합친 "내 공간"(다녀왔어요·저장·전체). `/archive/taste*`는 에디토리얼 모드에서 `/find`로 리다이렉트(LEGACY).
- **추천**: 아래 D.2 참고.
- **방명록**: `GuestbookNote/Reaction/Comment.userId` nullable + `anonId`. 로그인·취향점수 없이 작성 가능.
- **KPI**: 핵심 7단계 퍼널, `SceneReach`, Story Depth, 익명 조회 계측(`EpisodeRead.anonId`).
- **저장**: 기존 `SavedSpace`(Cube 상세 저장)에 `SavedEditorialSpace` 추가. 화면에서 slug로 합쳐 표시.

### B.3 정책 변경
| 변경 | 근거 |
|---|---|
| 첫 방문 흐름: Story → Guestbook 직행(로그인·취향점수 게이트 제거) | `guestbook/page.tsx` 주석, `upsertCurrentRecord(user.id, space.id, {})`로 점수 없는 Record 자동 확보. 비로그인은 anonId로 처리 |
| 관리자·`User.isDemo` 행동 KPI 제외 | `kpiEligibility.ts`, `demoData.ts` |
| 추천 신호 = 행동 강도 중심 (`PRODUCT_DECISIONS.md` "V1은 별점 요구 안 함") | `discoveryRecommend.ts` |
| HOME 시연 지역 모드: 지역 "망원" 고정, 다른 지역 "준비 중" | `shelves.ts` `applyDemoRegion`, `homeData.ts` `regionMode` |
| HOME LATEST 5개 고정, 소개 영역 제거 | `latestPick.ts`, `docs/CLAUDE_HANDOFF.md` |
| HOME 같은 공간 최대 2회 노출(hardCap), 카드 4장 미만 선반 숨김 | `homeData.ts` `diversifyHome`, `MIN_SHELF_CARDS=4` |

### B.4 비활성·제거·레거시 (현재 서비스 기능으로 쓰지 말 것)
| 항목 | 상태 | 근거 |
|---|---|---|
| `/discover` 공간 둘러보기 | HIDDEN (`ENABLE_PUBLIC_SPACE_BROWSER=false`) | features.ts:77 |
| 큐레이터(`CuratorProfile` 등), `/curators` | PROTOTYPE, `ENABLE_CURATOR_PROTOTYPE=false` | features.ts:94 |
| `/recommend` → `/find` 리다이렉트, `/recommendation` | LEGACY, 내비 없음 | features.ts:64~65 |
| `/archive/taste`, `/archive/taste/all` | LEGACY(에디토리얼 모드에서 `/find`로 이동) | 이전 감사 인용 |
| `/stories`(ContentStory), 지역·취향 스토리 | HIDDEN (`ENABLE_REGION_STORIES`, `ENABLE_TASTE_STORIES` false) | features.ts:8~9 |
| 방명록 사진·댓글·알림, 자동 이메일, AI 해설, 다국어 | 비활성(`pilotFlags.ts`, 기본 false) | `.env.example` |
| 손글씨 PoC | `ENABLE_HANDWRITING_POC` 기본 false | |
| `EditorialHomeSettings` | 테이블만 존재, 미사용 | schema 1572 |
| `/owner/*` | `/admin/*` 리다이렉트 | next.config.ts |
| 사람 추천 UI(옛 `/taste/[userId]` 쪽) | `ENABLE_SIMILAR_TASTE_PEOPLE_UI=false` | features.ts:27 |

---

## C. 기능별 기술 명세

### C.1 콘텐츠 기반 문화공간 발견 (신규)
- **화면**: HOME `/`, 검색 `/search`, `/find`(내비 제외·주소 유지), `/spaces`, `/spaces/[slug]`, CURATION `/curation/[slug]`, STORY `/story/[slug]`, `/cube-spaces`
- **흐름**: `getHomeData()`(`src/lib/home/homeData.ts`) → 공개 공간 Pool(`getFinderPool`) → 개인화 선반(`for-you`·`interest`·`similar`) + 지역/유형/테마 선반 + 편집 선반. 한 화면에서 `diversifyShelves`로 같은 공간 반복을 제한.
- **선반 규칙** (`shelves.ts`): 지역 선반은 지역당 공간 ≥3, 테마는 키워드(`HOME_THEMES` 9개)에 맞는 공간 ≥3(지역 선택 시 ≥2), 유형 선반 ≥2. 지역 선택은 `SUGGESTED_AREAS=[망원,연남,후암,서촌,성수]` 우선.
- **Fallback**: 개인화 순위가 6곳 미만(`MIN_PERSONAL=6`)이거나 로그인 안 한 경우 → `pickDiscoverySet`(유효 대표 이미지 있는 공간만, 유형·지역·태그 다양성 패널티 + 날짜(KST) seed 결정적 셔플). 제목 "지금 둘러보기 좋은 공간" — 취향 분석이라고 표시하지 않음.
- **DB**: `EditorialSpace`, `EditorialCuration`(+`...Space`), `EditorialPerson`, `EditorialThought`, `HomeShelf`(+`HomeShelfSpace`), `District`, `Category/Tag`
- **예외·정책**: `status=PUBLISHED`만 공개, 시연 공간은 `slug` 접두어 `demo-`일 때만 일반 공개(`publicSpaceFilter`). 시연 공간은 카드에 "시연용 공간"/"시연 컬렉션" 표시.
- **미구현/한계**: HOME·CURATION 조회 계측 없음(이전 감사 인용).
- **주의**: 이전 감사 문서(10/24 오전)는 "공개 실제 공간 6곳, 태그 0"으로 기록했으나, 그 후 시연 공간 11곳+확장 9곳이 DB에 추가됨(extended-spaces 문서). 현재 운영 수치 → **검증 필요**.

### C.2 공간 저장 및 방문 상태 관리 (신규)
- **저장**: `POST /api/saves/spaces/[spaceId]` → `SavedEditorialSpace` upsert, DELETE는 같은 slug의 `SavedSpace`도 함께 삭제. 로그인 필수(401), 발행 공간만(관리자는 초안 가능).
- **방문**: 공개 상세에서 "다녀왔어요" → `ArchiveEntry(status=VISITED)`, "또 갔어요" → `ArchiveVisit`. 관련 API `/api/archive/entries*`. Cube 방문은 `Record`(별도).
- **통합 표시**: `getLibrary()`가 `ArchiveEntry`+`Record`+`SavedEditorialSpace`+`SavedSpace`를 slug로 합침(원본 변경 없음).
- **비로그인**: `sc_intent`(nonce, 30분)로 로그인 후 저장/다녀왔어요 자동 완료(`pendingIntent.ts`).
- **지도**: `mapState` = saved/visited/revisit. 좌표 없는 공간은 지도에서 빠짐.

### C.3 QR 기반 진입 및 Episode형 이야기 (기존, 유지)
- `/c/[code]` → `GET /api/cube-entry/[code]`: Cube 재조회(클라이언트 값 불신) → `SpaceScan` 기록(userId 또는 anonId) → 쿠키 `sc_qr_access`(HMAC, 12시간) 발급, 로그인이면 `SpaceUnlock` upsert → 대표 Episode(`isFeatured`) 또는 첫 공개 Episode로 리다이렉트. 근거 `route.ts`.
- Episode 상태: `computeEpisodeState(unlockVisitCount, visitCount)` → LOCKED/NEWLY_UNLOCKED/UNLOCKED(3상태; 이전 문서의 "4상태"는 옛 표기).
- 계측: `EpisodeRead`(open/complete/durationMs), `SceneReach`.
- DB: `Cube`(code unique, status UNASSIGNED/ASSIGNED/DISABLED, spaceId unique), `Space`, `SpaceScan`, `SpaceUnlock`, `Episode`, `Scene`, `SceneImage`, `EpisodeRead`.
- 9/7 이후 변경: Reading Progress 연속 바 교체, Story Complete 판정(마지막 Scene 도달), 비로그인 anonId 조회 — 구조 변경 아님.

### C.4 방문 기록 기반 취향 분석 및 공간 추천 → D.2 상세

### C.5 디지털 방명록 (기존)
- `/space/[slug]/guestbook`: 로그인 사용자는 서버가 `upsertCurrentRecord(…, {})`로 점수 없는 Record 확보 후 `GuestbookNote.recordId` 연결. 비로그인은 `anonId`.
- 제약: `@@unique([userId, guestbookSessionId, recordId])`, `@@unique([anonId, guestbookSessionId])`(방문당 흔적 1개). `content` 최대 80자(VarChar(80)).
- 질문은 별도 테이블이 아니라 `GuestbookSession.question1/question2` 컬럼, 포스트잇 군집은 `GuestbookNote.clusterType`(FREE/QUESTION_1/QUESTION_2).
- 공감 `GuestbookReaction`(userId/anonId 이중 unique). 댓글·사진·알림 비활성.
- 샘플 방명록: 더미 계정(User.isDemo) 글이 방문자 화면에 표시 없이 노출되고 KPI·운영자 화면에서 제외(`PRODUCT_DECISIONS.md`). **심사 자료에서 "샘플 포함" 명시 권장.**

### C.6 개인 공간 아카이브 (기존, 구조 재편)
- `/archive`(내 공간), `/archive/p/[key]`, `/saved`, `/all`, `/following`. 신규 기능이 아니라 기존 아카이브의 확장으로 서술할 것.
- 공개 프로필 `/@handle`(`ProfileSpace`, 기본 공개), 사람 추천 `/find?tab=people`.

### C.7 사용자 행동 데이터 수집 및 분석 → D.4

---

## D. 데이터·추천·권한·KPI 상세

### D.1 권한 구조 (코드 근거)

| 역할 | 접근 가능한 것 | 근거 |
|---|---|---|
| **비로그인 방문자** | HOME·검색·공개 상세·CURATION·STORY 열람, QR 스캔, Episode 열람(12h 쿠키), 방명록 작성·공감(anonId), 지도 클릭·상세 조회 계측 대상 | `anonVisitor.ts`, `guestbook/page.tsx` |
| **로그인 사용자** | 위 전부 + 저장·다녀왔어요·내 공간·사람 팔로우·프로필·`SpaceUnlock` DB 영속 | `api/saves`, `api/archive` (401 처리) |
| **내부 관리자** | `ADMIN_EMAIL` 화이트리스트 이메일. `/admin/**` 전체(공간·Cube·콘텐츠 CMS·KPI·지역·태그·시연 데이터) | `lib/admin.ts` — 별도 role 테이블 없음 |
| **공간 운영자** | 라우트 `/operator`, `/operator/[slug]`, `/space`, `/guestbook`가 **존재**. 공간 검색 + 4자리 PIN(`Space.operatorPinHash`) → 서명 세션. 메뉴는 "내 공간 관리(공개 페이지 확인)", "방명록 관리" 2개 | `app/operator/**`, `operatorSession.ts` |

**개발보고서 서술("내부 관리자 CMS 운영, 공간 운영자 전용 페이지 현재 미제공")과의 검증 결과**
- 내부 관리자 CMS 운영: **일치**.
- 공간 운영자 전용 페이지: **코드상 접근 가능한 화면이 존재**하나, 앱 내 링크가 없다(Navbar/BottomTabBar는 `/operator`를 숨김 영역으로만 취급, 진입 링크 없음 — `grep` 확인). 사용자 화면에 노출·안내되지 않으므로 "일반 사용자에게 제공되는 기능"은 아님. 정확한 표현 후보: "코드는 구현되어 있으나 현재 서비스 메뉴에서 제공·안내하지 않음(직접 URL+PIN)".
- 운영 DB에서 실제로 PIN이 설정된 공간이 있는지 → **검증 필요**.
- 구 설계서 요구사항표의 `OPR-01-02 공간 소개 및 에피소드 관리`는 **코드와 불일치**: 운영자 화면은 공간 페이지 확인(읽기)과 방명록 관리뿐이고, 공간·Episode 편집은 관리자 전용(`MENU_ITEMS`, `/operator/[slug]/space`). `OPR-01-04 운영 데이터 조회`는 월간 메모 API(`/api/operator/spaces/[spaceId]/monthly-note`)가 있으나 리포트 열람 화면이 있는지는 **검증 필요**.
- 혼동 주의: 운영자 PIN 화면 ≠ 내부 관리자 CMS.

### D.2 추천 알고리즘 (실제 코드)

현재 추천 호출 지점은 3가지로 갈린다.

**① HOME 개인화 선반 + FIND(`/find`) 정렬 — 현재 운영 중인 주 경로**
파일: `src/lib/discoverySignals.ts`(신호 수집) → `src/lib/discoveryRecommend.ts`(프로필 구성) → `src/lib/finder/spaceFinder.ts`(`rankCandidates`) → `home/homeData.ts`.

처리 단계
1. 사용자 신호 수집 `getUserDiscoveryContext(userId)`: `Record`(시연 공간 제외, `TASTE_SIGNAL_RECORD_WHERE`), `SavedSpace`, `SavedEditorialSpace`, `ArchiveEntry`.
2. 방문 Record → `buildWeightedTasteVector`(`recommend.ts`): 공간당 **최신 Record 1개**(`getLatestRecordPerSpace`, visitedAt DESC→id DESC)만 사용, `weight = (tasteScore ?? 3) × SpaceTag.weight`, 추천 대상 태그만(`isActive && useForRecommendation`). Tag.id 벡터 → 태그 이름으로 변환.
3. 프로필 `buildTasteProfile`: 속성 이름(`attrKey` = trim·소문자·공백제거) → 가중치 합.
   - 저장(운영 `SavedSpace`/공개 `SavedEditorialSpace`): 공간의 태그·유형 이름마다 **+1.5** (`SAVE_WEIGHT`)
   - 아카이브 저장(`ArchiveEntry` SAVED): **+1.5** (`ARCHIVE_SAVED_WEIGHT`)
   - 아카이브 다녀왔어요(VISITED): **+4** (`ARCHIVE_VISITED_WEIGHT`)
   - 사용자가 고른 직접 태그: 위에 **+1** (`EXPLICIT_TAG_BONUS`)
   - 같은 공간이 저장+다녀왔어요(또는 운영·공개·아카이브 중복)면 한 번만 센다(아카이브 > 공개 저장 > 운영 저장 순). 연결된 공간 없는 개인 기록은 사용자가 고른 태그만.
   - Cube 방문 Record: 가중치 `score(1~5, 없으면 3) × SpaceTag.weight`(주석상 보통 3~5).
4. 후보 = 공개 공간 Pool(`getFinderPool`; 발행·시연 접두어 규칙). HOME은 이미 방문·저장한 공간 제외(`exclude`). FIND는 필터 후 정렬.
5. 점수 `rankCandidates`: `personal = Σ(후보의 category+tags 각각의 profile 가중치)` (+ 큐레이터 가산, 프로토타입 전용). 정렬: `personal` 내림차순 → `base`(공식 CURATION 수 + 컬렉션 수×0.5) → 공개 순서 `order`.
6. 이유 문구: 실제 겹친 속성이 있을 때만 "내 공간들과 비슷한 결"(`personalReason`), 다녀온 곳이면 "다녀온 공간". 점수·퍼센트는 사용자에게 노출하지 않음.
7. 노출 판단(HOME): `me.personalized && 후보 ≥ 6` 이면 개인화 선반("회원님을 위해 엄선한 공간"), 아니면 Fallback(C.1). 그 후 `diversifyShelves`(같은 공간 최대 2회).

**② 사람 추천 `rankPeople`** (`people/rankPeople.ts`): 점수 = 둘 다 다녀온 공간 수×3 + 둘 다 있는 공간(저장 포함) 수×2 + 결 겹침(0~1)×2 + 공개 공간 수×0.1(최대 8곳). 상대는 공개 프로필 공간만 사용. 점수는 응답에 내보내지 않음. 코사인 유사도 **아님**.

**③ 레거시 취향점수 경로** — 코드는 남아 있음
- `recommend.ts`: `rankSpacesByVector`(벡터 내적 합산, 점수>0만), `getMatchPercent`(1~99 클램프), `cosineSimilarity`(사용자 간 취향 유사도).
- 사용처: `app/archive/taste/page.tsx`, `archive/taste/all/page.tsx`, `app/discover/page.tsx`, `lib/guestbookReward.ts`. 이전 감사(인용)에 따르면 `/archive/taste*`는 에디토리얼 모드에서 `/find`로 리다이렉트되고 `/discover`는 `ENABLE_PUBLIC_SPACE_BROWSER=false`로 숨김. `guestbookReward.ts`의 실제 도달 경로는 **검증 필요**.
- 결론: `cosineSimilarity`는 **현재 HOME·FIND 추천에서 사용되지 않는다**(grep: `cosineSimilarity` 호출은 `archive/taste/page.tsx` 한 곳뿐). `ENABLE_TASTE_SCORE_RECOMMENDATION=true`이므로 `POST /api/records`는 여전히 `tasteScore`(1~5)를 필수로 요구한다(`route.ts:29`). 첫 방문 단순화 경로(`upsertCurrentRecord(…, {})`)에서는 `tasteScore=null`로 생성되어 벡터에서 중립값 3이 된다.

**구 설계서 알고리즘 슬라이드(26·27, ALG-01)와의 비교**
| 구 설계서 서술 | 현재 코드 | 판정 |
|---|---|---|
| 방문 Record의 취향 점수 1~5 사용 | 사용(null이면 3). 단 점수 없는 Record 생성 경로가 있음 | 부분 일치 |
| 공간당 최신 기록 1개만 반영 | `getLatestRecordPerSpace` 동일 | **일치** |
| 태그별 가중치 W(t)=Σ score×I(t∈Tags) | `score × SpaceTag.weight`(weight 기본 1이면 동일) | 일치(식에 weight 추가 필요) |
| RecScore = Σ W(t) 후 내림차순 | `rankSpacesByVector`/`rankCandidates` 동일 형태 | 일치 |
| 사용하지 않는 기준: 별점·리뷰·인기순·광고·유사 사용자 행동·**방명록 작성 여부** | 추가로 **저장(1.5)·아카이브(1.5/4)·직접 태그(+1)**를 신호로 사용 | **수정 필요** — "저장·방문 상태를 활용"으로 확장 |
| 대상 후보: 공개·추천 대상·특성 태그 등록 공간 | 후보는 `EditorialSpace`(공개 공간), 속성은 category+tags 이름 | 수정 필요 |
| 데이터 없음 시 "기록 부족 상태 반환" | HOME은 Fallback 선반, FIND는 기본 순서(큐레이션 포함 정도→공개 순서) | 수정 필요 |
| 추천 이유 "조용한 특성이 닮아…" | HOME/FIND는 "내 공간들과 비슷한 결" 한 문장 | 수정 필요 |
| 코사인 유사도 (사용자 간) | 사람 추천은 `rankPeople` 규칙 점수. 코사인은 레거시 페이지에만 존재 | 설계서에 있다면 **삭제/각주** |

**주의 (코드 주석 불일치)**: `discoverySignals.ts` 상단 주석은 "아카이브 직접 추가 2.5 · 다녀왔어요 3"이라 쓰여 있으나 실제 상수는 1.5 / 4다(`discoveryRecommend.ts:21~22`, 10/24 변경). **설계서에는 상수 값 기준(1.5/4)을 쓸 것.**

### D.3 DB·ERD

#### D.3.1 현재 모델 수
`schema.prisma` 기준 `model` **65개**(Account/Session/VerificationToken 등 NextAuth 포함). 9/6(`9c1e3b8`) 대비 +21, 삭제 0(이전 감사 인용; 이번에 모델 수 65는 grep으로 재확인).

#### D.3.2 구 설계서 ERD·테이블 정의서(슬라이드 23·29/30)와 실제 스키마 차이
| 구 설계서 표기 | 실제 스키마 | 조치 |
|---|---|---|
| `GuestbookQuestion` 엔티티 | **존재하지 않음**. 질문은 `GuestbookSession.question1/question2` | 삭제, 세션에 컬럼 표기 |
| `GuestbookNote.sessionId`, `questionId` | `guestbookSessionId`, `clusterType`(FREE/QUESTION_1/QUESTION_2) | 수정 |
| `GuestbookNote.userId` 필수(FK) | `userId?` + `anonId?` | 수정 |
| `GuestbookReaction.noteId` | `postId` (+ `userId?`/`anonId?`) | 수정 |
| `Space.introduction`, `operatorMessage`, `isPublished` | `description`, `ownerMessage`, `isActive`(+`isDemo`) | 수정 |
| `Cube.isActive`, `Cube.createdAt` | `status`(UNASSIGNED/ASSIGNED/DISABLED), `activatedAt`, `createdAt` | 수정 |
| `GuestbookSession.activatedAt/closedAt` | `startsAt`, `endsAt`, `status` | 수정 |
| `Episode.status`, `publishedAt` | `published`(Boolean), `isFeatured`, `episodeNumber` | 수정 |
| `Record.createdAt`, `recommendationViewedAt` | `Record`에 `createdAt` 없음(`visitedAt`), `recommendationViewedAt` **존재**, `guestbookViewedAt` 존재 | 수정 |
| `User.updatedAt` | 없음. `nicknameUpdatedAt`, `profile*`, `isDemo` 있음 | 수정 |
| `SpaceScan.scannedAt` 등 | 일치 + `anonId` 추가 | 컬럼 추가 |
| 테이블 정의서 슬라이드 30 "핵심 테이블 12개" | 현재 65개. 12개는 일부이므로 "핵심" 표기 유지 가능, 단 신규 모델 추가 필요 | 추가 |

※ 위 비교는 슬라이드 이미지에 보이는 컬럼 기준이며, 이미지에 표시되지 않은 컬럼은 생략됐을 수 있다(해당 부분은 오류가 아닐 수 있음).

#### D.3.3 신규·변경 모델 (실제 이름 · 주요 컬럼 · 제약)
| 모델 | 역할 | 주요 컬럼 | Unique/관계 | 기존 모델 연결 | 현재 사용 |
|---|---|---|---|---|---|
| `EditorialSpace` | 공개 공간(Cube 없어도 등록) | slug, name, area, category, tags[], coverImage, cubeAvailable, isDemo, status, story(Json) | slug unique | **FK 없음, slug로 `Space`와 논리 연결** | 사용 |
| `EditorialCuration`/`...Space` | 큐레이션과 공간 연결 | | | EditorialSpace | 사용 |
| `EditorialPerson`/`...Space`, `EditorialThought`/`...Space` | STORY(PEOPLE/THOUGHT) | | | EditorialSpace | 사용 |
| `SavedEditorialSpace` | 공개 공간 저장 | userId, spaceId | `[userId,spaceId]` | User, EditorialSpace | 사용 |
| `SavedSpace`(기존) | Cube 상세 저장 | userId, spaceId | `[userId,spaceId]` | User, Space | 사용 |
| `ArchiveEntry` | 내 공간 기록(저장/다녀왔어요) | userId, spaceId?, placeName, placeKey, status(SAVED/VISITED), sourceKind, tags[], memo | `[userId,spaceId]` | User, EditorialSpace? | 사용 |
| `ArchiveVisit` | 방문 회차 | entryId, visitedOn, memo | | ArchiveEntry | 사용 |
| `ArchivePhoto` | 사진 | entryId, visitId?, url | | ArchiveEntry/Visit | 사용 |
| `SavedRegion` | 관심 지역 | userId, area | `[userId,area]` | User | 사용 |
| `ProfileSpace` | 프로필 공개 공간 | userId, spaceId, hidden, show* | `[userId,spaceId]` | User, EditorialSpace | 사용 |
| `SavedTaste`(기존) | 취향 따라가기 | userId, targetUserId | `[userId,targetUserId]` | User | 사용(의미 확장) |
| `HomeShelf`/`HomeShelfSpace` | HOME 선반 설정 | key(unique), kind(SYSTEM/PERSONALIZED/EDITORIAL), visible, order | | EditorialSpace | 모델 사용. 이전 감사 기준 DB 0행 → 코드 기본값으로 동작(현재 → **검증 필요**) |
| `DiscoveryEvent` | 방문 전 행동 | spaceId(EditorialSpace.id), type(SPACE_VIEW/MAP_CLICK), userId?, anonId? | 인덱스만(unique 없음, 30분 중복은 쓰기 시 판정) | EditorialSpace, User | 사용 |
| `SceneReach` | Scene 도달 | sceneId, userId?, anonId? | `[userId,sceneId]`,`[anonId,sceneId]` | Scene | 사용 |
| `CuratorProfile`, `CuratorCollection`, `CuratorCollectionSpace` | 큐레이터 프로토타입 | | | | **PROTOTYPE(숨김)** — ERD 본도면 제외 권장 |
| `EditorialHomeSettings` | 구 HOME 설정 | | | | **미사용** — 제외 |

#### D.3.4 ERD 보조도면용 핵심 관계
```
User 1─N SavedEditorialSpace N─1 EditorialSpace
User 1─N ArchiveEntry N─0..1 EditorialSpace ; ArchiveEntry 1─N ArchiveVisit ; ArchiveEntry 1─N ArchivePhoto
User 1─N SavedSpace N─1 Space                       (Cube 상세 저장)
User 1─N SavedRegion ; User 1─N ProfileSpace N─1 EditorialSpace
User 1─N DiscoveryEvent(nullable) N─1 EditorialSpace
EditorialSpace ┈┈(slug 동일, FK 없음)┈┈ Space  (Partner: cubeAvailable=true)
Space 1─0..1 Cube ; Space 1─N SpaceScan ; Space 1─N SpaceUnlock N─1 User
Space 1─N Episode 1─N Scene 1─N SceneImage ; Episode 1─N EpisodeRead ; Scene 1─N SceneReach
Space 1─N GuestbookSession 1─N GuestbookNote ; GuestbookNote N─0..1 Record ; GuestbookNote 1─N GuestbookReaction
User 1─N Record N─1 Space
Space 1─N SpaceKPI ; Space 1─N SpaceMonthlyReport
```
`EditorialSpace ↔ Space`는 **점선(논리 연결)** 로 그려야 정확하다. 스키마 주석 "기존 모델과 FK 없음"은 맞지만 실제로는 slug join으로 결합됨(`saves.ts`, `libraryMap.ts`, `discoveryKpi.ts`).

### D.4 사용자 행동 계측·KPI

| 단계 | 저장 위치 | 식별 | 중복 처리 | 비고 |
|---|---|---|---|---|
| 공간 상세 조회 | `DiscoveryEvent` SPACE_VIEW | userId 또는 anonId(`sc_anon_id`) | 같은 방문자·공간·종류 30분 내 무시(쓰기 시) | 관리자·비발행·**isDemo 공간 미기록** |
| 지도 클릭 | `DiscoveryEvent` MAP_CLICK | 동일 | 동일 | 이전 감사 시점 0건 → 현재 **검증 필요** |
| 저장 | `SavedEditorialSpace.createdAt`(+`SavedSpace`) | userId(로그인 전용) | unique | 별도 이벤트 없음, 저장 후 해제하면 사라짐 |
| HOME·CURATION·STORY 조회 | **계측 없음** | — | — | 갭 |
| QR Scan | `SpaceScan` | 로그인=userId, 비로그인=anonId | 중복 제거 없음(원시 로그) | ScanTracker `logged=1`로 이중 기록 방지 |
| Episode 열람/완료 | `EpisodeRead` (openedAt/completedAt/durationMs) | userId/anonId, 각 `[…,episodeId]` unique | unique | 완료=마지막 Scene 본문 도달 |
| Scene 도달 | `SceneReach` | 동일 | unique | |
| 방문 기록 | `Record` | userId | 12시간 재방문 규칙(`REVISIT_INTERVAL_HOURS`), advisory lock | |
| 방명록 진입·작성 | `GuestbookFunnelEvent`(ENTRY_ATTEMPT, WRITE_ATTEMPT, LOGIN_REQUIRED, LOGIN_SUCCESS, GUESTBOOK_VIEWED, EXPERIENCE_COMPLETE), `GuestbookNote` | userId/anonId | `[…, spaceId, step]` unique | |
| 집계 | `SpaceKPI`(일 스냅샷, `recomputeSpaceKPI`), `SpaceMonthlyReport`, `reportMetrics.ts`(퍼널), `getHourlyPeriodStats`(KST) | | | |

- **제외 정책**: 관리자(`ADMIN_EMAIL` → `kpiEligibility.ts`), `User.isDemo` 계정, `Space.isDemo`/`EditorialSpace.isDemo` 공간(`demoData.ts`). 비로그인 행은 JS에서 거름(NULL NOT IN 문제 회피). 방명록 샘플 작성자도 제외.
- **현재 계산 가능한 KPI**: 상세 조회 고유 방문자, 저장 사용자, 지도 클릭 → 7일 내 동일 공간 QR 스캔 전환(`countMapClickConversions`, `MAP_TO_SCAN_WINDOW_MS`), QR 진입 고유 방문자, Story 조회·완독률·체류시간, 방문 Record, 재방문률, 방명록 진입·작성, 핵심 7단계 퍼널(QR Entry→Story View→Story Complete→Guestbook Viewed→Write Attempt→Post-it→Experience Complete), 시간별/기간별 KPI.
- **계산할 수 없는 것(계측 없음)**: HOME·CURATION·STORY(에디토리얼) 조회, 검색어·클릭, 추천 선반 클릭/전환, 일반(비Partner) 공간의 방문 확인.
- **주의 (Discovery KPI 한계)**: 시연 공간(`isDemo`)은 이벤트·KPI에서 제외되므로 시연 공간에서의 행동으로는 Discovery KPI 수치가 쌓이지 않는다. 전환율 표는 실측이 없으면 "계측 구조 구현"으로 서술(이전 감사 권고와 동일).

### D.5 프로그램·라우트·기술 구성

**프론트 주요 페이지**: HOME `/`, `/search`, `/find`, `/spaces`, `/spaces/[slug]`(+`@modal`), `/curation[/slug]`, `/story[/slug]`, `/archive` 하위, `/u/[handle]`(`/@handle` rewrite), `/settings`, `/login`, `/about`, `/cube-spaces`, `/spacecube`, `/c/[code]`, `/space/[slug]`(+`episodes/[id]`, `record`, `guestbook`, `complete`), `/operator/*`, `/admin/*`.

**서버 API(`src/app/api/**/route.ts`) 그룹**: 진입·계측(`cube-entry`, `scans`, `episode-reads`, `scenes/[id]/reach`, `discovery-events`, `guestbook/write-attempt`), 기록(`records`, `guestbook*`), 발견·저장(`saves/spaces`, `archive/entries*`, `regions`, `search`, `people/search`, `profile*`, `tastes`), 관리자(`admin/editorial/*`, `home-shelves`, `cubes*`, `districts`, `tags`, `categories`, `spaces*`, `episodes`, `scenes`, `interview*`), 운영자(`operator/verify-pin|search|logout|spaces/...`), 인증(`auth/[...nextauth]`), 크론(`cron/monthly-reports`).

**공통 서비스(`src/lib`, 149개 파일)**: `home/`(선반·다양성·테마), `finder/`, `search/`, `editorial/`(pendingIntent·saves·queries), `archive/`(library·libraryMap), `people/`, `discoveryRecommend.ts`·`discoverySignals.ts`·`recommend.ts`, `discoveryKpi.ts`·`reportMetrics.ts`·`kpi.ts`·`monthlyReport.ts`, `spaceUnlock.ts`, `visit.ts`·`recordVisit.ts`, `anonVisitor.ts`, `demoSpaces.ts`·`demoData.ts`·`kpiEligibility.ts`, `operatorSession.ts`·`operatorPin.ts`.

**인증**: NextAuth `5.0.0-beta.30` + `@auth/prisma-adapter`, Google·Kakao, `session.user.id`. 관리자는 이메일 화이트리스트, 운영자는 PIN 서명 쿠키, 비로그인 QR 열람은 `sc_qr_access`(HMAC 12h)와 `sc_anon_id`.

**파일·이미지**: Cloudinary(`next.config.ts` `res.cloudinary.com`), 클라이언트 업로드+서명 업로드(`archive/upload-signature`). 지도: Kakao Maps/Local(관리자 좌표·주소 연결, `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`, `KAKAO_REST_API_KEY`).

**DB**: Prisma 5.22.0 + PostgreSQL(Neon 주석 근거 `.env.example`/이전 문서). 빌드는 `prisma db push && prisma generate && next build`(마이그레이션 파일 방식 아님).

**버전(package.json/node_modules 확인)**: Next.js 16.1.6, React 19.2.3, TypeScript ^5, Tailwind ^4, Prisma/@prisma/client ^5.22.0(설치 5.22.0), next-auth ^5.0.0-beta.30, framer-motion ^12.42.2, react-zoom-pan-pinch ^4.0.3, qrcode ^1.5.4, bcryptjs ^3.0.3, openai ^6.46.0(번역, 비활성), vitest ^4.1.10, eslint ^9. 로컬 Node v22.13.0(배포 Node 버전은 **검증 필요**).
**배포**: Vercel 추정 — 저장소에 `vercel.json` 없음, 이전 감사·문서에서 Vercel 근거. 현재 배포 상태 **검증 필요**. `.github/workflows` 존재(이전 감사는 CI 없음으로 기록했으나 이번에 디렉터리 존재 확인 — 내용은 Claude 작업 디스패치 워크플로로 **추정**, 확인 필요).

**구 설계서 개발환경(슬라이드 32)과 비교**: Next.js 16.1.6·React 19.2.3·TypeScript 5·Tailwind 4·Prisma·Neon·Vercel 값은 코드와 일치(유지). "Pretendard Web Font"는 이번에 코드로 확인하지 않음(**검증 필요**). "Next.js API Routes … 추천과 운영자 관리 API"는 유지 가능. Kakao Maps/Local(관리자), Cloudinary는 슬라이드에 없으므로 추가 후보. "소셜 로그인"은 Google·Kakao로 구체화 가능.

---

## E. 제작설계서 페이지별 수정 가이드

범례: 유지 / 부분 수정 / 대폭 수정 / 추가 / 검증 필요. 슬라이드 내용은 이미지라 아래 판정은 **구성(제목)과 코드 사실의 비교**이며, 직접 내용을 본 슬라이드는 "(확인)"으로 표시했다.

| 페이지 | 구성 | 판정 | 이유·근거 | 우선순위 |
|---|---|---|---|---|
| 1 | 표지 | 부분 수정 | 날짜 2026.9.7 → 수정일. 프로젝트명 부제는 7개 기능 분류와 일치 | 낮음 |
| 2 | 산출물표 | 유지 | (확인) 텍스트 추출됨. 구조 변경 없음 | — |
| 3~5 | 시장·설문·인터뷰 | 검증 필요 | 코드로 확인 불가(외부 조사) | — |
| 6~7 | 요구사항 정의서 | **부분 수정+추가** | (확인 7p) A01~A04는 QR·이야기·방문기록·아카이브. 문제점: ① "A03_B01 취향 점수 입력"을 필수처럼 서술 — 첫 방문 운영 경로에선 불요(`[구현 vs 운영]`) ② "A03_B03 방명록 작성"의 로그인 전제 표현 ③ **Discovery 요구(발견·저장·방문 상태·내 공간·지도·KPI)가 없음 → 추가** | 높음 |
| 8~9 | 유즈케이스 | 부분 수정+추가 | 액터 "비로그인 탐색자" 및 공간 탐색/저장/다녀왔어요/지도 열기 UC 추가. 운영자 UC는 코드 범위(방명록 관리·공간 확인)로 한정 | 높음 |
| 10~11 | 서비스 시나리오·구성도 | 부분 수정 | Discovery 계층(HOME·검색·내 공간) 블록 추가. 기존 현장 계층은 유지 | 높음 |
| 12 | 서비스 흐름도 | 부분 수정 | 앞단에 `HOME/검색→상세→저장/다녀왔어요→지도→QR` 추가. 방명록 직행(게이트 제거) 반영 | 높음 |
| 13~14 | UI/UX 정의서 | 부분 수정 | 현행 UI 원칙(공간 매거진 톤, 모바일 하단탭 홈·검색·내 공간) 반영. **검증 필요**: 슬라이드 내용 | 중간 |
| 15~16 | 메뉴 구성도 | **대폭 수정** | 현재 최상위는 HOME·검색·내 공간(+햄버거: CURATION·STORY·지역·테마·설정·공간큐브). 구 메뉴(추천·아카이브 상단 탭 등)와 충돌 가능. **검증 필요**(슬라이드 본문) | 높음 |
| 17~19 | 화면 설계서 | 부분 수정+추가 | Discovery 화면(HOME·검색·상세·내 공간·지도) 추가. 방명록/Episode 화면은 유지. 비로그인 방명록 반영 | 높음 |
| 20~22 | 사용자 인터페이스(sw) | 부분 수정 | 추천/아카이브 화면 캡처는 `/archive/taste` 레거시일 수 있음 → **검증 필요**, 현행 화면으로 교체 | 높음 |
| 23 | ERD | **대폭 수정** | (확인) `GuestbookQuestion` 등 존재하지 않는 엔티티, 컬럼명 다수 상이(D.3.2). 보조도면(Discovery) 추가, slug 점선 | **최상** |
| 24~25 | 기능 처리도 | 부분 수정+추가 | 저장 토글, 다녀왔어요/또 갔어요, MAP_CLICK 기록, intent 복원, 선반 구성 추가 | 중간 |
| 26~27 | 알고리즘 명세서 | **대폭 수정** | (확인) ALG-01 "취향 점수 가중 기반 추천" 단일 서술. 현행: 행동 강도(방문·저장·아카이브) 태그 이름 매칭 + Fallback + 사람 추천. "사용하지 않는 기준"에 방명록만 아니라 저장·아카이브 사용 사실 반영(D.2 표) | **최상** |
| 28 | 프로그램 목록 | 부분 수정+추가 | (확인) 기능번호 AUT/ENT/EPS/RCD/GST/ARC/REC/OPR/ADM 체계 유지 가능. 문제: `OPR-01-02 공간 소개 및 에피소드 관리`(운영자는 읽기만) 오류, `RCD-01-01 취향 점수 입력`을 필수 기능으로 기술, Discovery 분류(예: DSC) 없음 → 추가 | 높음 |
| 29 | 테이블 정의서 | 부분 수정+추가 | (확인 30p) 예시 GuestbookNote 컬럼: `userId` 필수 → nullable+anonId, `content` 최대 80자·`recordId` 선택은 일치. 신규 모델(D.3.3) 추가 | 높음 |
| 30~31 | 핵심 소스코드 | 검증 필요 | 슬라이드에 어떤 코드가 있는지 미확인. `buildWeightedTasteVector` 등 현존 함수는 유효. 선택 추가: `rankCandidates`, `countMapClickConversions` | 중간 |
| 32 | 개발환경 | 부분 수정 | (확인) 버전은 일치. Kakao Maps/Local, Cloudinary 추가, Pretendard 확인 필요 | 낮음 |
| 33~34 | S/W·H/W 실사 | 부분 수정 | S/W는 Discovery 화면 캡처 추가. H/W(투명 아크릴 큐브)는 코드로 확인 불가 | 중간 |
| 35~36 | 영상 콘티 | 검증 필요 | 9월 QR 영상 유지, Discovery는 별도 보충(이전 감사 권고) | 낮음 |
| 37~38 | 프로젝트 관리 | 검증 필요 | 일정·인원은 코드 외 정보 | — |
| 39 | 마무리 | 유지 | | — |

---

## F. 수정 시 반드시 피해야 할 오류

1. **Archive·추천을 신규 기능으로 쓰지 않는다.** 개인 아카이브(Record 기반)와 취향 기반 추천은 9/7 이전 구현이며 9월 이후는 "확장".
2. **QR Cube·Episode·Scene·방명록 핵심 구조를 신규/변경으로 쓰지 않는다.** `cube-entry`는 9/7 이후 변경 없음(이전 감사 인용).
3. **취향 점수 1~5와 코사인 유사도를 현재 운영 추천 알고리즘으로 쓰지 않는다.** 취향 점수는 Record에 남고 벡터에 쓰이지만 HOME·FIND 점수는 속성 이름 가중치 합이며, 코사인은 레거시 취향 페이지에만 있다. 반대로 "취향 점수를 아예 쓰지 않는다"도 틀림(Record 가중치에 포함, 점수 없는 Record는 3).
4. **`GuestbookQuestion` 같은 존재하지 않는 테이블, `Space.isPublished`, `Cube.isActive` 등을 쓰지 않는다**(D.3.2).
5. **방명록이 로그인·취향 점수를 요구한다고 쓰지 않는다**(비로그인 작성 가능). 단 구현 성과로서의 게이트 이력은 "운영 경로 변경"으로 표기.
6. **운영자와 관리자를 혼동하지 않는다.** 운영자=PIN 세션의 방명록 관리/공간 확인, 관리자=`ADMIN_EMAIL` 기반 CMS. 운영자가 Episode를 편집한다고 쓰지 않는다. 운영자 화면은 서비스 메뉴에 노출되지 않음.
7. **파트너 / 일반 / 시연 공간을 구분한다.** Partner=`cubeAvailable=true`(Cube·Episode 보유). 일반 공간=`EditorialSpace`(Cube 없음). 시연 공간=`isDemo=true`, slug `demo-`(가상) 또는 `demo-ext-`(실제 장소의 일반 공간, Partner 아님). 시연 공간은 KPI·추천 신호·Discovery 이벤트에서 제외된다. 시연 공간 수치를 성과로 인용하지 않는다.
8. **비활성 기능을 현재 제공 기능으로 쓰지 않는다**: 다국어, 자동 이메일, 방명록 사진·댓글·알림, `/discover`, 큐레이터, 손글씨 PoC.
9. **HOME 지역이 "망원"으로 고정된 것은 시연 지역 모드(`ENABLE_PUBLIC_DEMO_SPACES`)의 결과**임을 구분한다. 실제 지역 확장 구조(`SUGGESTED_AREAS`, `District`)와 다르다.
10. **Map Click→QR 전환율 등 실측 수치를 만들지 않는다.** 구조 구현만 서술(실측 → 검증 필요).
11. **오래된 문서의 수치를 인용하지 않는다**: `contest-2026-technical-reference.md`(9/2 기준: 39개 모델, 방명록 로그인 게이트)는 stale. 현재 65개 모델.
12. **코드 주석 불일치**: `discoverySignals.ts` 상단(2.5/3), `features.ts`의 `ENABLE_PUBLIC_DEMO_SPACES` 주석("운영 DB에는 없는 코드 데이터")은 10/24 DB화 이후 stale. 주석이 아니라 상수·코드를 기준으로 쓸 것.
13. `HomeShelf`는 모델이 있다고 해서 운영 선반 설정이 쓰인다고 단정하지 않는다(이전 감사 기준 DB 0행).

---

## G. ChatGPT 전달용 요약

**서비스**: 공개 문화공간을 HOME·검색으로 발견·저장·"다녀왔어요"로 관리하고, Partner 공간에서는 QR Cube로 Episode·Scene·방명록을 경험하는 웹서비스. 7개 S/W 기능 분류는 유지 가능하나 4번(추천)은 서술 보정 필요. H/W는 QR Cube(코드로는 QR↔식별자까지만 검증).

**9/7 이후 신규**: 공개 공간 계층(`EditorialSpace`, Cube 없이 등록), HOME 선반·지역·검색, 공개 공간 상세(데스크톱 창), 저장(`SavedEditorialSpace`)/다녀왔어요(`ArchiveEntry`·`ArchiveVisit`), 내 공간 지도, `DiscoveryEvent`(SPACE_VIEW/MAP_CLICK), CMS(CURATION/STORY), 로그인 의도 복원, 사람 추천·공개 프로필, 시연 공간 정책. **확장**: Archive, 추천, 방명록(비로그인), KPI. **변경**: 첫 방문 방명록 직행. **비활성**: `/discover`, 큐레이터, 다국어·자동 이메일·방명록 사진/댓글/알림, 손글씨.

**유지**: QR→Cube→Episode/Scene→Record(12h 재방문)→방명록→아카이브. 9/7 이후 `cube-entry` 코드 변경 없음.

**권한**: 비로그인(열람·QR·방명록 작성·계측), 로그인(저장·내 공간·프로필), 관리자(`ADMIN_EMAIL` 이메일, `/admin`), 운영자(`/operator`, PIN, 방명록 관리·공간 페이지 확인만, 서비스 메뉴에 노출 없음).

**추천 실제 처리**: ① 신호 = Cube 방문 Record(공간당 최신 1개, `(tasteScore??3)×SpaceTag.weight`) + 저장 1.5 + 아카이브 저장 1.5 / 다녀왔어요 4 + 직접 태그 +1(중복 공간은 1회). ② 후보 = 공개 공간, 속성 = category+tags 이름. ③ 점수 = 겹친 속성 가중치 합, 0점 제외, 정렬 점수→큐레이션 수→공개 순서. ④ HOME은 이미 방문·저장한 공간 제외, 후보 6곳 미만이면 Fallback("지금 둘러보기": 이미지 있는 공간, 다양성, 날짜 seed 셔플), 같은 공간 최대 2회. ⑤ 사람 추천 = 같은 방문 ×3 + 같은 공간 ×2 + 결 겹침 ×2 + 공개 공간 수 ×0.1. ⑥ 코사인 유사도·매치 퍼센트는 레거시 페이지에만 존재(현재 HOME·FIND 미사용).

**DB**: 65개 모델. 구 ERD 오류 — `GuestbookQuestion` 없음(질문은 `GuestbookSession.question1/2`), `GuestbookNote.guestbookSessionId`·`clusterType`·`userId?`·`anonId?`, `GuestbookReaction.postId`, `Space.description/ownerMessage/isActive`, `Cube.status`, `Episode.published`. 추가 필수: EditorialSpace, EditorialCuration(+연결), EditorialPerson/Thought(+연결), SavedEditorialSpace, ArchiveEntry/Visit/Photo, SavedRegion, ProfileSpace, HomeShelf(+Space), DiscoveryEvent, SceneReach. `EditorialSpace.slug ≡ Space.slug`는 점선.

**KPI**: 방문 전 = `DiscoveryEvent`(30분 중복 무시, userId/anonId), 저장=`SavedEditorialSpace.createdAt`. 방문 후 = SpaceScan·EpisodeRead·SceneReach·Record·GuestbookFunnelEvent·GuestbookNote. 제외 = 관리자, `User.isDemo`, `isDemo` 공간. 계산 가능: Map Click→7일 내 QR 스캔, 7단계 퍼널. 불가: HOME/CURATION 조회, 검색, 추천 선반 클릭. 실측치 없는 수치는 "구조 구현"으로.

**페이지별 우선 수정**: 23 ERD(대폭), 26·27 알고리즘(대폭), 15·16 메뉴(대폭, 본문 확인 필요), 6·7 요구사항(Discovery 추가·취향점수 필수 표기 수정), 8·9, 10~12 흐름, 17~22 화면, 28 프로그램 목록(`OPR-01-02` 오류), 29 테이블. 유지: 2, 39, 개발환경 버전. 검증 필요: 3~5, 13~14 내용, 30~31, 35~38.

**검증하지 못한 것**: 운영 DB 현재 수치(공간 수·PIN 설정·Map Click), Vercel 배포 상태, 전체 테스트/빌드 통과, 슬라이드 본문(이미지) 대부분, Pretendard, `guestbookReward.ts` 도달 경로, 운영자 리포트 열람 화면 유무.
