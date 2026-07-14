# SpaceCube 프로젝트 감사 보고서

- **조사 날짜**: 2026-07-14
- **기준 커밋**: `4359bbf61ff8930e7b7451ad3cd83ed62f6d4420` (master)
- **검증 명령 실행 결과**: `npm run test` — 75 passed (11 files) / `npm run lint` — 132 errors, 12 warnings(대부분 기존에 알려진 스타일 규칙 위반, 빌드는 막지 않음) / `npm run build`는 직전 세션에서 코드 변경 없이 통과 확인됨(이번 감사에서는 코드 미변경이라 재실행하지 않음)
- **이 문서는 조사 전용입니다. 어떤 파일도 삭제·수정하지 않았습니다.** 실행 계획(승인 후 별도 작업)은 10번 섹션 참고.

---

## 1. 전체 요약

```
전체 페이지 라우트 수(page.tsx): 40
전체 API 라우트 수(route.ts):    60
Prisma 모델 수:                  35
Vitest 테스트 파일 / 케이스:      11 files / 75 cases (전체 통과)

미사용(고아) 후보:  API 6건 + 페이지 3~5건 + 컴포넌트 3건 ≈ 12~14건
중복 후보:          함수/컴포넌트 9건 + 시스템 수준 2건(QR 이중체계, KPI 삼중집계)

P0(즉시 수정 필요):     0건 — 이번 감사에서 확정된 P0는 없음(경계 사례 2건은 아래 참고)
P1(MVP 전 수정 권장):   6건
P2(정리하면 좋은 항목): 8건
P3(이후 개선):          6건
```

**중요 — P0가 "0건"인 이유**: 이 리포트 직전 두 세션에서 이미 (1) 방명록 포스트잇 충돌 방지 + 방문 단위 재작성 정책, (2) 추천 로직의 재방문 점수 누적 버그, (3) 운영자 `ownerId` 기반 인가가 새로 도입·수정되었습니다. 이번 감사는 그 결과물을 포함한 현재 코드를 기준으로 했고, 사용자 데이터 노출/권한 우회/오답 KPI·추천/방명록 데이터 충돌에 해당하는 새 문제는 발견되지 않았습니다. 다만 "지금은 맞지만 구조적으로 어긋나기 쉬운" 경계 사례(§9)는 있습니다.

---

## 2. 가장 중요한 문제 TOP 10

### #1. 방명록 캔버스에 가짜 포스트잇 60개가 항상 실제 데이터와 섞여 노출됨
- **관련 파일**: `src/app/space/[slug]/guestbook/dummyNotes.ts`, `GuestbookCanvas.tsx:147`(`const allNotes = [...DUMMY_NOTES, ...notes]`)
- **현재 영향**: 실제 방문자가 남긴 진짜 흔적과 시드 고정 PRNG로 생성한 가짜 60개가 시각적으로 구분 없이 한 캔버스에 렌더링됨. 파일 자체 주석이 "실제 DB 연동 전 UX 실험용"이라고 스스로 인정하고 있어, 프로토타입 단계 산출물이 정리되지 않고 프로덕션에 그대로 남은 사례로 판단됨.
- **수정 필요성**: 높음 — 사용자에게 조작된 콘텐츠를 실제처럼 보여주는 것은 신뢰 문제로 이어질 수 있음.
- **권장 방식**: 세션에 실제 노트가 일정 개수 이상이면 더미를 자동으로 줄이거나, 완전히 제거하고 "아직 흔적이 적은 공간" 상태에 맞는 별도 빈 상태 UI로 대체.
- **수정 위험도**: 낮음(단일 파일 상수 배열 제거, 렌더링 로직 한 줄 수정) — 단, "캔버스가 휑해 보이는" 디자인 의도가 있었다면 기획 확인 필요.

### #2. `/operator`(운영자 월간 운영 페이지)에 앱 내 진입 링크가 전혀 없음
- **관련 파일**: `src/components/Navbar.tsx`(전체), `src/app/operator/page.tsx`
- **현재 영향**: `grep`으로 전체 `src` 검색 결과 `/operator`를 가리키는 `<Link>`/`redirect`가 자기 자신(operator 하위 페이지들) 외에 단 한 곳도 없음. 최근 세션에 DB 연동까지 완료된(월간 리포트, 방명록 열람, 다음 회차 준비, 개인 메모) 완성된 기능이지만, 실제 운영자는 URL을 직접 알아야만 접근 가능.
- **수정 필요성**: 높음 — 기능은 완성됐는데 사실상 미출시 상태.
- **권장 방식**: (a) 로그인한 사용자의 `User.id`가 어떤 `Space.ownerId`와 일치하면 네비게이션에 "운영" 진입점을 노출하거나, (b) 최소한 로그인 후 안내 페이지/이메일 링크로 URL을 전달하는 절차 마련.
- **수정 위험도**: 낮음(네비게이션 추가일 뿐, 권한 로직은 이미 `requireSpaceAccess`로 구현되어 있음).

### #3. QR 발급 체계가 두 개 공존(`/owner/[id]/qr` 레거시 vs `/owner/cubes` 신규 Cube 모델)
- **관련 파일**: `src/app/owner/[id]/qr/page.tsx`, `src/app/owner/cubes/CubeManager.tsx`, `prisma/schema.prisma`(Cube 모델)
- **현재 영향**: `/owner/[id]/qr`는 `space.slug?src=qr`로 직결되는 구식 방식(Cube 모델·`SpaceScan.cubeId` 미사용)이고, `/owner/cubes`는 `Cube`(UNASSIGNED/ASSIGNED/DISABLED, `spaceId` unique) 기반의 신규 체계로 `/c/[code]` 경유. 두 QR을 관리자가 혼용하면 스캔 계측 정밀도가 갈림(신규 쪽만 `cubeId`/`userAgent`/`referrer`/`locale`이 남음).
- **수정 필요성**: 높음 — 어떤 QR을 실제로 인쇄해서 현장에 붙였는지에 따라 데이터 품질이 달라짐.
- **권장 방식**: 레거시 `/owner/[id]/qr`를 사용 중단(deprecated) 안내로 바꾸거나, `/owner/cubes` 흐름으로 완전히 대체.
- **수정 위험도**: 중간 — 이미 오프라인에 인쇄되어 붙어있는 구형 QR이 있다면 즉시 제거는 위험, 단계적 전환 필요.

### #4. KPI/월간 리포트/운영자 페이지, 세 곳에서 유사 집계 로직이 중복 구현됨
- **관련 파일**: `src/lib/kpi.ts`(`recomputeSpaceKPI`, `computePeriodStats`), `src/lib/monthlyReport.ts`(`generateOrGetMonthlyReport`), `src/app/operator/page.tsx`(리포트·방명록·아카이브 통계를 파일 내부에 직접 재구현)
- **현재 영향**: `/api/operator/spaces/[spaceId]/report`, `/guestbook`, `/guestbook/archive` API가 존재하는데도 `app/operator/page.tsx`가 이 API들을 호출하지 않고 거의 동일한 Prisma 쿼리·직렬화 코드를 페이지 내부에 다시 작성함(§7 참고). 지금 당장은 숫자가 일치하지만, 한쪽만 고치고 다른 쪽을 놓치면 관리자 KPI 화면과 운영자 리포트 화면의 숫자가 어긋나는 P0급 문제로 발전할 수 있음.
- **수정 필요성**: 높음(잠재적 위험의 씨앗).
- **권장 방식**: `app/operator/page.tsx`가 이미 존재하는 `/api/operator/spaces/**` 라우트의 서비스 함수(라우트 핸들러가 호출하는 내부 로직)를 직접 import해서 재사용하도록 리팩터링. API 라우트 자체를 지울지, 페이지가 API를 쓰게 할지는 통합 방향 결정 필요.
- **수정 위험도**: 중간 — 서버 컴포넌트 구조를 바꿔야 해서 회귀 테스트 필요.

### #5. `/space/[slug]/done`이 완전히 도달 불가능한 페이지인데 추천 로직 전체를 중복 보유
- **관련 파일**: `src/app/space/[slug]/done/page.tsx`, `src/app/space/[slug]/record/RecordForm.tsx:69`
- **현재 영향**: `RecordForm`은 기록 저장 후 항상 `/space/${slug}/guestbook`(or `?mode=write`)로 이동하고, 레포 전체에서 `/done`으로 가는 코드는 없음(grep으로 확인). 그런데 이 페이지 안에는 `buildWeightedTasteVector` + `rankSpacesByVector`를 이용한 완전한 추천 계산 블록이 그대로 살아있어, 최신 추천 정책(방문당 최신 점수만 반영) 변경 시 이 죽은 코드는 놓치기 쉬움.
- **수정 필요성**: 높음 — 죽은 코드가 실제 로직과 같은 함수를 호출하고 있어 "고쳐야 할 곳"에 잘못 포함되거나, 반대로 다음 사람이 이 코드를 살아있는 줄 알고 참고할 위험.
- **권장 방식**: 페이지 전체 삭제(현재 완료 화면은 `PostSubmitReward.tsx`가 사실상 대체).
- **수정 위험도**: 낮음(참조하는 곳이 없음, 단 삭제 전 최종 확인 필요).

### #6. `.env.example`이 존재하지 않고, 실제로 쓰는 환경변수 중 상당수가 어디에도 문서화되어 있지 않음
- **관련 파일**: 프로젝트 루트(`.env.example` 부재), `src/components/ImagePositionEditor.tsx`, `owner/SpaceForm.tsx`, `owner/stories/StoryForm.tsx`, `GuestbookCanvas.tsx`(Cloudinary), `api/cron/monthly-reports/route.ts`(`CRON_SECRET`)
- **현재 영향**: 실제 코드가 참조하는 환경변수: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CRON_SECRET`. 기존 memory 문서(`project_stack.md`)에는 앞의 7개만 기록되어 있고, Cloudinary 2개와 `CRON_SECRET`, `OPENAI_API_KEY`는 어디에도 정리되어 있지 않음. 새 환경(신규 배포, 새 팀원 온보딩)에서 빠뜨리기 쉬움 — 특히 `CRON_SECRET` 누락 시 월간 리포트 자동화가 조용히 실패함.
- **수정 필요성**: 높음(배포/운영 리스크).
- **권장 방식**: `.env.example` 신설 + 위 11개 변수 전부 나열(값은 비움).
- **수정 위험도**: 없음(문서 작업).

### #7. 날짜 포맷 함수(`formatDate`/`formatDots`)가 최소 8개 파일에서 각자 재구현됨
- **관련 파일**: `archive/page.tsx`, `taste/[userId]/page.tsx`, `operator/page.tsx`, `owner/cubes/CubeManager.tsx`, `guestbook/page.tsx`, `guestbook/archive/page.tsx`, `guestbook/archive/[sessionId]/page.tsx`, `owner/[id]/dashboard/NotePanel.tsx`, `components/GuestbookCommentThread.tsx`(`formatDots`), `operator/GuestbookBrowser.tsx`(`formatDots`)
- **현재 영향**: 전부 `yyyy.mm.dd` 포맷의 동일 로직(널 가드 유무만 차이). `src/lib/time.ts`에는 `formatRelativeTime`만 있고 이 포맷용 공용 함수가 없음.
- **수정 필요성**: 중간 — 버그는 아니지만 한 곳의 포맷을 바꾸면 8곳을 다 찾아 고쳐야 함.
- **권장 방식**: `lib/time.ts`에 `formatDotDate()` 추가 후 교체.
- **수정 위험도**: 낮음(순수 함수, 로케일 고정).

### #8. 관리자 화면 곳곳에 동일한 `Toggle`/토스트/폼 인풋 패턴이 반복 구현됨
- **관련 파일**: `Toggle` 컴포넌트가 `GuestbookSettingsForm.tsx`, `ReportSettingsForm.tsx`에 완전 동일 코드로 중복(그 외 `EpisodeEditor`, `StoryForm`, `TranslationManager`도 유사 마크업 인라인). 토스트(`showToast`+`setTimeout`) 패턴은 `ContentStatusList`, `CubeManager`, `DeleteSpaceButton`, `DeleteStoryButton`, `TagManager`, `EpisodeList`, `SceneManager`, `GuestbookCanvas` 8개 파일.
- **현재 영향**: 유지보수 시 8~10곳을 각각 수정해야 함. 기능적 결함은 없음.
- **수정 필요성**: 중간(정리 가치 있음, 급하지 않음).
- **권장 방식**: `ToggleSwitch.tsx` 공용 컴포넌트, `useToast()` 훅 추출.
- **수정 위험도**: 낮음.

### #9. 완전 고아 컴포넌트 3개(`ArchiveSearch.tsx`, `StoryTabs.tsx`, `SpaceStory.tsx`)
- **관련 파일**: `src/app/archive/ArchiveSearch.tsx`(레포 전체에서 import하는 곳 0건, 자기 자신조차 `archive/page.tsx`에 없음), `src/app/space/[slug]/StoryTabs.tsx`(어디서도 import 안 됨), `src/app/space/[slug]/SpaceStory.tsx`(`StoryTabs.tsx`만 이걸 참조하는데 그 `StoryTabs` 자체가 고아라 사실상 함께 죽음, `OwnerStory.tsx` 주석이 "레거시"라고 스스로 인정).
- **현재 영향**: 없음(완전 미사용, 빌드에도 영향 없음).
- **수정 필요성**: 낮음(급하지 않지만 완전히 안전하게 삭제 가능).
- **권장 방식**: 3개 파일 삭제.
- **수정 위험도**: 매우 낮음(참조 0건 확인됨).

### #10. 관리자 공간 삭제가 되돌릴 수 없는 완전 cascade 하드 삭제
- **관련 파일**: `src/app/api/spaces/[id]/route.ts`(`DELETE`, `prisma.space.delete`), `prisma/schema.prisma`(Space와 연결된 대부분의 모델이 `onDelete: Cascade`)
- **현재 영향**: 공간 하나를 삭제하면 해당 공간의 `Record`, `GuestbookSession`/`Note`/`Comment`/`Reaction`, `Episode`/`Scene`(+번역), `SpaceKPI`, `SpaceMonthlyReport`, `WaitlistEntry` 등이 전부 영구 삭제됨. 클라이언트에 확인 모달은 있지만(`DeleteSpaceButton.tsx`), 백업·soft-delete·export 같은 2차 안전장치는 없음. `Space.isActive` 토글(비활성화)이 이미 있어 일반적인 "운영 중단"에는 하드 삭제가 필요 없어 보이는데도, 하드 삭제가 유일한 삭제 수단으로 남아 있음.
- **수정 필요성**: 높음 — 사용자가 지정한 P0 기준("데이터 손실")에 가장 근접한 항목. 다만 실수로 발동하는 버그가 아니라 관리자가 의도적으로 실행하는 기능이라 P1로 분류.
- **권장 방식**: 삭제 전 "정말 삭제"에 공간명 재입력 요구 등 2차 확인 강화, 또는 하드 삭제 대신 `isActive=false` + 별도 "완전 삭제"를 관리자 최상위 권한으로 분리.
- **수정 위험도**: 낮음(UI 안전장치 추가일 뿐 데이터 구조 변경 없음).

---

## 3. 삭제 후보

| 파일/기능 | 사용되지 않는 근거 | 삭제 시 영향 | 안전하게 삭제 가능한지 |
|---|---|---|---|
| `src/app/archive/ArchiveSearch.tsx` | 레포 전체 grep 결과 import하는 곳 0건 | 없음 | 예 |
| `src/app/space/[slug]/StoryTabs.tsx` | 어디서도 import 안 됨 | 없음 | 예 |
| `src/app/space/[slug]/SpaceStory.tsx` | `StoryTabs.tsx`만 참조(그 자체도 고아), `OwnerStory.tsx` 주석이 레거시라 인정 | 없음 | 예 |
| `src/app/space/[slug]/done/page.tsx` | `RecordForm`이 더 이상 이 경로로 이동하지 않음, 레포 전체에 링크 없음 | 없음 | 예(§2 #5) |
| `GET /api/stories`, `GET /api/stories/[id]` | 호출부 없음(페이지가 Prisma 직접 조회) | 없음 | 예, 단 외부 연동(다른 서비스가 이 API를 직접 호출) 가능성은 없는지 한 번 더 확인 권장 |
| `GET /api/tags` | 호출부 없음(`owner/tags/page.tsx`가 Prisma 직접 조회) | 없음 | 예 |
| `GET /api/operator/spaces`, `GET /api/operator/spaces/[spaceId]/report`, `GET /api/operator/spaces/[spaceId]/guestbook`, `GET /api/operator/spaces/[spaceId]/guestbook/archive` | 호출부 없음(§7) | §2 #4와 연계 — 삭제보다는 **operator 페이지가 이 API를 쓰도록 통합**을 먼저 권장(무작정 삭제하면 중복 로직이 그대로 남음) | 통합 후 삭제 |
| `src/components/QRDownload.tsx` | `CubeQR.tsx`의 완전한 부분집합(PNG 다운로드만) | 사용처를 `CubeQR`로 교체 후 삭제 | 통합 후 삭제 |

**주의**: 위 목록은 "삭제해도 되는 것"이지 "지금 삭제하라"는 뜻이 아닙니다. 승인 후 별도 작업에서 처리해주세요.

---

## 4. 통합 후보

| 중복 대상 | 공통 부분 | 분리해야 할 부분 | 권장 구조 |
|---|---|---|---|
| `formatDate`(8곳) / `formatDots`(2곳) | `yyyy.mm.dd` 포맷 로직 | `NotePanel.tsx`만 `M월 d일` 포맷이라 별도 유지 | `lib/time.ts`에 `formatDotDate()` 추가 |
| `SaveSpaceButton.tsx` / `SaveTasteButton.tsx` | 저장/해제 토글 state, 로그인 리다이렉트, POST/DELETE 구조 | 엔드포인트, `callbackUrl` 유무 | `useToggleSave(endpoint)` 공용 훅 |
| `QRDownload.tsx` / `CubeQR.tsx` | `QRCode.toCanvas`, 다운로드 트리거 | `CubeQR`만 SVG 다운로드/URL 복사 지원 | `CubeQR`로 일원화 |
| `Toggle`(GuestbookSettingsForm/ReportSettingsForm 등) | 온오프 슬라이더 마크업 | 없음(완전 동일) | `components/ToggleSwitch.tsx` |
| 토스트 패턴(8곳) | `showToast`+`setTimeout`+고정 마크업 | 지속시간(2~3초)만 다름 | `useToast()` 훅 + `<Toast/>`, duration 옵션화 |
| `operator/page.tsx` 인라인 통계 vs `/api/operator/spaces/**` | 리포트/방명록/아카이브 집계 Prisma 쿼리 | 페이지는 서버 컴포넌트라 굳이 fetch 안 해도 되지만, 최소한 **같은 서비스 함수**를 호출해야 함 | 라우트 핸들러가 쓰는 조회 로직을 `lib/`로 뽑아 페이지·API 양쪽이 재사용 |
| `GuestbookBrowser.tsx`(운영자) / `ArchiveSessionView.tsx`(사용자) 포스트잇 카드 | 그리드 레이아웃, 색상(#F6E7A8/#3d3524), 모달 셸 | 운영자는 개인정보 미노출 + 읽기 전용, 사용자는 공감/댓글 포함 | 카드·모달 셸만 공용 프레젠테이션 컴포넌트로 추출, 액션 영역은 children/slot으로 분리 |
| `formInput`/`label` 스타일 상수(owner 폼 다수) | className 문자열 반복 | 없음 | 공용 상수 모듈 또는 `<FormInput/>` |

---

## 5. 유지해야 하는 유사 구조

이름·역할이 겹쳐 보이지만 **목적이나 권한이 달라 통합하면 안 되는** 항목:

- **`isAdmin`(화이트리스트) vs `ownerId`/`requireSpaceAccess`(운영자 인가)**: 전자는 플랫폼 관리자, 후자는 특정 공간의 소유자. `src/lib/operatorAuth.ts`가 이미 "관리자는 전체 접근, 운영자는 자기 공간만"으로 명확히 분리해서 구현되어 있음(§9 참고, 문제 없음).
- **`/owner` vs `/operator`**: 관리자(플랫폼 운영) vs 공간 운영자(자기 공간만) — 권한 스코프가 다름. 진입 링크 부재(§2 #2)는 문제지만 구조 자체는 유지.
- **`SpaceKPI`(일별 누적 스냅샷, 관리자 전용 KPI 화면) vs `SpaceMonthlyReport`(운영자 대상 확정 구간 리포트)**: 이미 project_kpi_structure.md에 "목적이 다름"이 문서화되어 있고 실제로도 다름(누적 vs 구간, 라이브 vs 고정 스냅샷). 계산 로직의 **구현 중복**(§2 #4)만 정리하고 모델 자체는 유지.
- **`GuestbookReaction`(공감 자체) vs `Notification`(공감/댓글이 발생했다는 알림)**: 역할이 완전히 다름, 중복 아님.
- **`GuestbookCanvas.tsx`(작성 가능한 실시간 무한 캔버스) vs `ArchiveSessionView.tsx`(종료 세션의 정적 읽기 전용 카드)**: 인터랙션 모델이 근본적으로 다름(팬줌+충돌방지+작성 vs 단순 그리드). 카드 셸만 공용화 검토(§4), 전체 통합은 비권장.
- **`SpaceCards.tsx` / `RecommendationPlaylist.tsx` / `VisitedSpacesPager.tsx`**: 각각 발견 페이지 그리드, 취향 추천 캐러셀, 방문 기록 페이저로 레이아웃·인터랙션이 뚜렷이 다름. 페이저 화살표/인디케이터 도트만 소형 공용 컴포넌트로 뽑는 것은 검토 가능하나 전체 통합은 비권장.
- **`SpaceTranslation` / `EpisodeTranslation` / `SceneTranslation`**: 계층 구조가 다른 3개 원문 테이블(Space/Episode/Scene) 각각의 번역이라 중복이 아니라 정상적인 분리(project_i18n_structure.md에 설계 의도 문서화됨 — Episode 본문은 Episode가 아니라 Scene에 있어서 별도 테이블이 필요했던 사례).

---

## 6. Prisma 정리 후보

| 항목 | 분류 | 설명 |
|---|---|---|
| `GuestbookNote.recordId`, `GuestbookComment.recordId`/`guestbookSessionId` (nullable) | **위험해서 유지 권장** | 방문 단위 정책 도입 이전 데이터 호환용. non-null 전환 시 과거 데이터가 깨짐 — 유지. |
| `Space.spaceTags`(레거시 `TagKey[]`) + `SpaceTag`(신규 관계 테이블) 병행 | **통합 검토** | 두 체계가 함께 쓰이고 있음(신규 공간은 SpaceTag, 과거 공간은 spaceTags 배열 폴백). 전환이 끝나면 `spaceTags` 제거를 검토할 수 있으나, 현재는 `buildWeightedTasteVector` 등 여러 추천 함수가 실제로 폴백 경로로 참조 중이라 지금 지우면 안 됨. |
| `RecordTag.tag`(레거시 enum) | **위험해서 유지 권장** | `ENABLE_RECORD_TAG_SELECTION=false`라 신규 생성은 안 되지만, 과거 데이터 보존 + 플래그 복구 시 재사용 목적으로 스키마에 남겨둔 것으로 판단됨(`RecordTag.tagId`가 신규 경로). 삭제 금지. |
| `MonthlyReportStatus.READY` | **유지** | 현재 워크플로우에서 실제로 안 쓰이지만(`COLLECTING`/`READY`는 저장 자체가 안 됨, 항상 바로 `PUBLISHED`), 향후 "생성 후 승인 공개" 2단계 확장을 위해 의도적으로 예약된 값(monthlyReport.ts 주석에 명시). 삭제하지 말 것. |
| `GuestbookNote`에 `guestbookSessionId` 인덱스 없음 | **마이그레이션 필요(검토)** | `@@unique([userId, guestbookSessionId, recordId])`는 있지만, "이 세션의 노트 전부"를 가져오는 `findMany({ where: { guestbookSessionId } })` 조회(캔버스 로딩, 충돌 검사, KPI)가 여러 곳에 있어 단독 인덱스 추가를 검토할 만함. 데이터 규모가 작은 지금은 체감 이슈 없음 — P3. |
| `Space` 삭제 cascade 범위(§2 #10) | **위험해서 유지 권장하되 안전장치 보강** | 스키마 구조 자체(Cascade)는 정상 설계지만 UI 안전장치가 얕음. |
| 진짜 "중복 모델"(같은 목적의 모델 2개 이상) | **없음** | GuestbookReaction/Notification, SpaceKPI/SpaceMonthlyReport, 3종 Translation 모두 §5에서 설명한 대로 목적이 분리되어 있어 진짜 중복 모델은 발견되지 않음. |
| 항상 null이거나 죽은 필드 | **없음(발견 안 됨)** | `Space`의 `ownerValues`/`ownerPlaylistUrl`/`ownerBlogUrl`/`ownerSocialUrl`는 `spaces/[id]/route.ts` PATCH 주석에 "공간 페이지에서 더 이상 보여주지 않는 필드, 폼에서 편집 안 함"이라고 명시돼 있어 **UI에서만 숨겨진 것**(값이 있으면 보존)이지 스키마상 죽은 필드는 아님 — 다음 UI 정리 시(§8) 이 필드들을 실제로 어디서도 read하지 않는지 재확인 권장. |

---

## 7. API 정리 후보

| API | 사용 여부 | 중복 대상 | 조치 |
|---|---|---|---|
| `GET /api/stories`, `GET /api/stories/[id]` | 미사용(호출부 없음) | 페이지의 Prisma 직접 조회와 중복 | 삭제 검토 |
| `GET /api/tags` | 미사용 | `owner/tags/page.tsx`와 중복 | 삭제 검토 |
| `GET /api/operator/spaces` | 미사용 | `operator/page.tsx`의 `resolveOperatorSpaces` 직접 호출과 완전 중복 | §2 #4와 함께 통합 |
| `GET /api/operator/spaces/[spaceId]/report` | 미사용 | `operator/page.tsx` 내 인라인 쿼리와 완전 중복 | 통합 |
| `GET /api/operator/spaces/[spaceId]/guestbook` | 미사용 | 〃 | 통합 |
| `GET /api/operator/spaces/[spaceId]/guestbook/archive` | 미사용 | 〃 | 통합 |
| `POST /api/episodes/[episodeId]/read` | 호출부를 이번 조사에서 특정 못함 | - | 에피소드 리더 화면 쪽 재확인 필요(놓쳤을 가능성 있음, 삭제 후보 아님) |
| 나머지 53개 API | 전부 실사용 확인됨, 인증 방식 적절 | - | 조치 불필요 |

**인증 방식 총평**: `/api/admin/*`는 전부 `isAdmin`, `/api/operator/*`는 전부 `requireSpaceAccess`(내부 `canAccessSpace`), 그 외 관리자 기능은 접두사 없는 flat 패턴이지만 전부 `isAdmin` 체크가 있음. 인증 자체가 없는 라우트(`scans` POST, `spaces/by-slug` GET, `stories`/`waitlist` 일부 GET/POST)는 전부 "의도적으로 공개"되어야 하는 성격(방문자 등록/공개 조회)이라 문제 아님. **관리자 전용인데 일반 로그인만 확인하거나, 운영자가 남의 공간에 접근 가능한 경로는 발견되지 않음.**

---

## 8. UI 정리 후보

공간큐브 핵심 흐름(`QR → 공간 이야기 → 취향 점수 → 방명록 → 추천 → 아카이브`)을 강화하지 않는 요소:

- **더미 포스트잇 60개**(§2 #1) — 핵심 흐름 어디에도 기여하지 않고 오히려 신뢰를 해칠 수 있음.
- **`ENABLE_REGION_STORIES`/`ENABLE_TASTE_STORIES` 죽은 분기**: 홈 스토리 카드, `/discover`·`/stories`의 타입 필터, `owner/page.tsx`의 "[[ 지역/취향 이야기 ]]" 버튼 — 전부 렌더 안 됨. 플래그 복구 계획이 없다면 코드 정리 후보(있다면 §5처럼 유지).
- **`ENABLE_RECORD_TAG_SELECTION=false`로 죽은 "태그 2개 선택" UI**(`RecordForm.tsx`)와 각 화면의 "레거시: 정적 리스트/태그 겹침 추천" `else` 분기(`discover`, `done`, `archive`) — 현재 정책(취향 적합도 점수 기반)과 무관.
- **`SHOW_REACTION_BOARD=false`로 죽은 반응보드 관련 문단**(`space/[slug]/page.tsx`의 usageSummary/anonymousReactions 섹션, `owner/page.tsx`의 "[반응 보드]" 링크) — `/owner/[id]/dashboard`로 가는 유일한 진입점이 이 죽은 링크라, dashboard 페이지 자체도 사실상 도달 불가.
- **QR 발급 이중 체계**(§2 #3) — 사용자에게는 안 보이지만 관리자 혼란을 유발해 결국 스캔 데이터 품질 저하로 핵심 흐름(QR 진입)에 악영향.
- **아카이브 계열 4곳(캔버스/세션 아카이브/개인 아카이브/타인 프로필)에서 같은 포스트잇을 각기 다른 카드 마크업으로 재구현**(§4) — 기능 중복은 아니지만 유지보수 시 스타일이 어긋나기 쉬움.

---

## 9. 권한 및 데이터 위험 (P0/P1 중심)

- **권한 우회**: 발견되지 않음. 관리자 API 60개 전수 조사 결과 인증 누락·검사 우회 경로 없음(§7).
- **운영자 간 데이터 침범**: 발견되지 않음. `/api/operator/*` 전 라우트가 `requireSpaceAccess`를 통과함.
- **클라이언트에서만 막고 서버는 안 막는 경우**: 발견되지 않음(모든 관리자/운영자 액션이 API 레벨에서도 재검증됨).
- **경계 사례 1 — KPI/리포트 삼중 구현(§2 #4)**: 지금은 정답이 같지만, 세 파이프라인이 완전히 분리된 코드로 존재해 "한쪽만 고치는" 실수가 곧 오답 KPI로 이어질 수 있는 구조적 위험.
- **경계 사례 2 — 공간 하드 삭제(§2 #10)**: 버그는 아니지만 사용자가 정의한 "데이터 손실" P0 카테고리와 가장 근접. 안전장치 보강 권장.
- **참고**: 방명록(세션/노트/댓글/공감/알림), 추천(취향 벡터), 큐브 인가 관련 기존 알려진 P0급 이슈들은 이미 직전 세션들에서 수정 완료됨 — 이번 감사에서 재발 여부를 확인했고 문제 없음.

---

## 10. 권장 정리 순서

```
1단계: 데이터/UX 리스크 우선 — 더미 포스트잇 정책 결정(§2 #1), 공간 삭제 안전장치 보강(§2 #10),
        .env.example 작성(§2 #6)
2단계: 이전 구조 정리 — /space/[slug]/done 삭제, ArchiveSearch/StoryTabs/SpaceStory 삭제,
        미사용 API(stories/tags/operator GET 4종) 삭제 또는 통합
3단계: 시스템 수준 통합 — QR 이중 체계 일원화(§2 #3), operator 페이지와 API의 KPI 로직 통합(§2 #4)
4단계: 컴포넌트/함수 공통화 — formatDate, Toggle, 토스트, SaveXButton, QR 컴포넌트(§4)
5단계: 죽은 플래그 분기 정리 — 스토리/레거시 태그/반응보드 관련 코드, 플래그 복구 계획 재확인 후 결정
6단계: 성능/구조 개선 — react-hooks/set-state-in-effect 3건, GuestbookNote 세션 인덱스, 번들 분석
```

---

## 부록 A. 향후 정리 체크리스트

- [ ] 더미 포스트잇(`dummyNotes.ts`) 노출 정책 결정(제거/조건부 표시)
- [ ] `/operator` 진입 링크 추가
- [ ] QR 발급 체계 일원화 방향 결정
- [ ] `operator/page.tsx` ↔ `/api/operator/spaces/**` 로직 통합
- [ ] `/space/[slug]/done` 삭제
- [ ] `.env.example` 작성(11개 변수 전체)
- [ ] `ArchiveSearch.tsx`, `StoryTabs.tsx`, `SpaceStory.tsx` 삭제
- [ ] 미사용 API 5종(`stories` GET 2개, `tags` GET, `operator/spaces` GET 3종) 삭제 또는 통합 확정
- [ ] `formatDate`/`formatDots` → `lib/time.ts` 공용 함수로 통합
- [ ] `SaveSpaceButton`/`SaveTasteButton`, `QRDownload`/`CubeQR` 통합
- [ ] `Toggle`, 토스트 패턴 공용 컴포넌트/훅 추출
- [ ] 공간 하드 삭제에 2차 확인(이름 재입력 등) 추가
- [ ] `@types/qrcode`를 `devDependencies`로 이동
- [ ] `src/lib/admin.ts` 주석의 실제 이메일 제거
- [ ] `POST /api/episodes/[episodeId]/read` 실제 호출부 재확인
- [ ] `react-hooks/set-state-in-effect` 위반 3건(`ThemeToggle`, `OnboardingOverlay`, `WaitlistPanel`) 검토
- [ ] `ENABLE_REGION_STORIES`/`ENABLE_TASTE_STORIES`/`ENABLE_RECORD_TAG_SELECTION`/`SHOW_REACTION_BOARD` 플래그, 복구 계획 없으면 관련 코드 정리 검토

---

## 부록 B. "핵심 경험만 남긴다면 무엇이 남아야 하는가?"

공간큐브의 핵심 흐름(`QR 스캔 → 공간 이야기 → 취향 점수 → 방명록 → 추천 → 아카이브`) 기준으로 반드시 남아야 하는 것:

- **진입**: `/c/[code]` → `Cube`/`SpaceScan` 체계(레거시 `/owner/[id]/qr`는 일원화 대상)
- **공간 경험**: `/space/[slug]`, Episode/Scene(+번역), `SpaceUnlockScreen`
- **기록**: `/space/[slug]/record`, `Record`(+`RecordTag` 레거시 보존), `isNewVisit` 재방문 정책
- **방명록**: `GuestbookSession`(DRAFT/ACTIVE/ARCHIVED) 기반 전체 구조(Note/Reaction/Comment/Notification), 방문 단위 정책, 충돌 방지 — 최근 개편으로 이미 정교화 완료
- **추천**: `getLatestRecordPerSpace` 기반 최신 점수 취향 벡터, `buildWeightedTasteVector`/`rankSpacesByVector`
- **아카이브**: `/archive`, `/taste/[userId]`, 방명록 흔적 타임라인
- **관리자/운영자**: `isAdmin` 화이트리스트(플랫폼 전체) + `ownerId`/`requireSpaceAccess`(공간별 운영), `SpaceKPI`+`SpaceMonthlyReport`(목적 분리 유지)

**핵심 흐름에 기여하지 않아 정리 후보인 것**: 더미 포스트잇, 죽은 스토리/레거시 태그 추천/반응보드 플래그 분기, QR 이중 체계 중 레거시 쪽, `/space/[slug]/done`, 고아 컴포넌트 3종, 미사용 API 5~6종. 이들을 정리해도 사용자가 실제로 겪는 핵심 경험에는 영향이 없습니다.
