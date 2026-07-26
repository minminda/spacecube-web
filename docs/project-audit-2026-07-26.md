# 프로젝트 전체 재감사 (2026-07-26)

이 문서는 코드를 전혀 수정하지 않은 순수 조사 결과입니다. 2026-07-14 `project-audit.md`, 2026-07-16
`real-world-pilot-audit-2026-07.md` 이후 운영자 PIN 인증 도입, `session.user.id` 기반 사용자 식별 전환,
KPI/월간리포트 페이지 통합, 도메인 전환(gonggancube.com), 큐브코드 체계 통일(GC-###), 그리고 오늘
`/operator` 전체 메뉴형 재구조화까지 진행된 뒤 처음부터 다시 전수 조사했습니다. **기존 두 문서는
상당 부분 stale합니다** — 특히 "미사용 API 후보"로 지목한 라우트 대부분이 이미 삭제됐거나 애초에 오판이었고,
"이미 구현되어 있다"고 언급한 `operatorAuth.requireSpaceAccess`는 현재 코드베이스에 존재하지 않습니다
(PIN 기반 `operatorSession.ts`로 완전히 교체됨). 이번 문서를 최신 기준으로 삼으십시오.

조사 범위: 전체 페이지(49개), 전체 API 라우트(67개), Prisma 스키마(48 모델/enum), 인증/권한 4개 축,
유틸 함수, npm 의존성, 마이그레이션 스크립트, 문서.

---

## 우선순위 요약

### P0 — 없음
서비스 장애나 보안 문제로 이어지는 항목은 발견되지 않았습니다.

### P1 — 정리 가치가 분명한 것 (안전하게 삭제/수정 가능)

| # | 항목 | 근거 |
|---|---|---|
| 1 | `src/app/owner/[id]/dashboard/NotePanel.tsx` 완전 고아 컴포넌트 | 레포 전체 import 0건. `dashboard/page.tsx`는 `WaitlistPanel`, `MoodPanel`만 사용 |
| 2 | `src/app/api/episodes/[episodeId]/read/route.ts` 완전 중복 API | 읽음 처리는 이미 `space/[slug]/episodes/[episodeId]/page.tsx:136`에서 서버 컴포넌트가 직접 수행. 이 라우트는 호출부 0건 |
| 3 | `CLUSTER_LABELS` 상수 중복 | `src/components/ReportEmail.tsx:20-23`와 `src/app/operator/[spaceId]/guestbook/GuestbookManageList.tsx:18-22`에 완전히 동일한 객체가 복붙됨. `src/lib/guestbookClusterStyle.ts`로 통합 가능 |
| 4 | `isAdmin \|\| ownerId === user.id` 우회 판정식 6곳 복붙 | `space/[slug]/page.tsx:128`, `record/page.tsx:48`, `complete/page.tsx:55`, `guestbook/page.tsx:92`, `episodes/[episodeId]/page.tsx:101`, `api/records/route.ts:52` — 완전히 동일한 식. `canBypassSpaceLock()` 헬퍼로 통합 가능 |
| 5 | `prisma/schema.prisma:412` 주석이 옛 큐브코드 체계(`SC-0001`) | 실제 코드는 `GC-###`로 통일된 지 오래(`src/lib/cubeCode.ts`). 스키마 주석만 안 고쳐짐 |
| 6 | `src/app/api/cron/monthly-reports/route.ts:74` 가드 없는 `console.log` | 다른 디버그 로그 10건은 전부 `if (debug)` 가드 안에 있는데 이 1건만 프로덕션에서도 항상 실행되며 리포트 페이로드 전체를 stringify해서 남김 |
| 7 | `@types/qrcode`가 `dependencies`에 위치 | 타입 전용 패키지라 `devDependencies`가 맞음 |
| 8 | 오래된 감사 문서 2건의 stale 서술 | `docs/project-audit.md`, `docs/real-world-pilot-audit-2026-07.md`가 존재하지 않는 API/함수를 근거로 언급 |

### P2 — 판단이 필요한 것 (기획/네이밍 결정 동반)

| # | 항목 | 내용 |
|---|---|---|
| 1 | `/owner/**` 이름-역할 불일치 | 23개 페이지 전부 `isAdmin` 게이트, 컴포넌트명도 `AdminPage`, UI도 "ADMIN"인데 폴더명은 "owner". 진짜 운영자 영역(`/operator`)과 이름이 충돌해 혼동 유발. `/admin`으로 개명 검토 가치 있음(대규모 라우트 이동이라 별도 계획 필요) |
| 2 | `/operator` 인앱 진입 링크 전무 | 오늘 만든 메뉴 홈을 포함해 앱 어디에도 `/operator`로 가는 `<Link>`가 없음. 운영자에게 URL을 구두/문자로 전달하는 전제로 보이는데, 의도된 설계인지 확인 필요 |
| 3 | 같은 리소스에 배타적인 두 인가 축 | `GuestbookSession` 스타일 갱신을 관리자 API(`guestbook-sessions/active`, `isAdmin`만)와 운영자 API(`guestbook-style`, `requireOperatorSpace`만)가 나눠 갖는데, 관리자가 PIN 세션을 갖고 있어도 운영자 API는 통과 못 하고 그 반대도 마찬가지. 의도된 축 분리인지, 관리자도 운영자 API를 쓸 수 있어야 하는지 확인 필요 |
| 4 | 두 태그 시스템 병행 | `Space.spaceTags`(레거시 `TagKey[]`, 스키마 주석엔 "이전 예정")가 여전히 `archive`, `discover`, `SpaceForm` 등 핵심 경로의 주 데이터이고, 신규 `SpaceTag`/`Tag`는 추천 로직에서만 쓰임. "이전 예정"이 몇 달째 진행되지 않은 상태 |
| 5 | 전역 `loading.tsx` 톤 불일치 | 세그먼트별 3개(`archive`, `discover`, `space/[slug]`)는 한국어 브랜드 카피(`"공간을 탐색하는 중_"`)인데, 전역 하나(`src/app/loading.tsx`)만 영문 `"LOADING_"`. `/`, `/login`, `/owner/*`, `/operator/*` 등 대부분의 라우트가 이 영문 버전을 그대로 노출 |
| 6 | `/owner`=관리자 결정이 README/CLAUDE.md에 문서화 안 됨 | 근거는 `docs/project-audit.md`(감사 문서)에만 있고, 신규 참여자가 보는 README는 create-next-app 기본값 그대로. CLAUDE.md 자체가 없음 |
| 7 | `openai` 의존성이 현재 설정에서 사실상 미사용 | `ENABLE_MULTILINGUAL=false`로 번역 API가 막혀 있어 파일럿 기간 동안은 dead. 플래그 재활성화 대비 의도적 보존으로 보이나 확인 필요 |

### P3 — 경미하거나 근거가 있어 유지가 맞는 것

- `src/app/owner/[id]/{guestbook-sessions,guestbook-settings,kpi,report-settings}` 4개 리다이렉트 스텁 — 각 파일에 "왜 남겨뒀는지" 주석이 있고 외부 북마크 보존 목적. **삭제 후보 아님.**
- `sc_operator_access`, `sc_qr_access`, `sc_locale` 등 `sc_` 접두 쿠키명·`spacecube_onboarding` localStorage 키 — spacecube 시절 명칭이지만 값 변경 시 기존 세션이 끊기므로 유지가 맞음.
- `src/app/api/operator/spaces/[spaceId]/monthly-note/route.ts` — 오늘 세션에 UI 호출부만 제거하고 API·데이터는 의도적으로 보존. 다만 그 의도를 설명하는 주석이 없어 다음 세션에서 죽은 코드로 오인될 위험.
- 마이그레이션 스크립트 6종(`migrate-tag-system.ts` 등)은 전부 1회성 백필 완료, 재실행 불필요. `migrate-districts.ts`만 이름과 달리 "신규 배포 시마다 필요한 초기 시드"라 `seed-districts.ts`로 개명하는 편이 명확.
- `.env.example`은 잘 관리되어 있음. 주석 중 "spacecube-web.vercel.app" 문구만 도메인 전환 이전 서술로 철 지남.

---

## 카테고리별 상세

### 1. 중복 구현
- `CLUSTER_LABELS` 상수 2곳 복붙(P1-3)
- `isAdmin || ownerId === user.id` 우회식 6곳 복붙(P1-4)
- 날짜 포맷 자체 구현: `formatDotDate`(`src/lib/time.ts`)를 두고 `ReportEmail.tsx:35`, `GuestbookCanvas.tsx:479`가 글자 단위로 동일한 포맷을 재구현. `NotePanel.tsx:18`(어차피 고아라 삭제 대상), `owner/[id]/report/page.tsx:26`, `archive/[recordId]/page.tsx:58`도 각자 다른 방식으로 자체 포맷.

### 2. 서로 겹치는 페이지와 기능
- `/owner/[id]/qr`, `/owner/cubes`, `/operator/[spaceId]/cube` 세 화면이 모두 `CubeQR` 컴포넌트를 렌더링. 역할은 분리되어 있음(관리자 조회 전용 / 관리자 전체 관리 / 운영자 조회 전용)이라 문제는 아니지만, 세 화면 모두 유지할 가치가 있는지는 검토 여지.
- `/owner/[id]/qr`은 이미 "큐브 QR로 일원화됐다"는 자체 주석과 함께 `/owner/cubes`로 유도하는 안내형 페이지로 정리되어 있어 실질적 중복은 아님.

### 3. 사용되지 않는 코드
- `NotePanel.tsx`(P1-1), `episodes/[episodeId]/read/route.ts`(P1-2).
- `ArchiveSearch.tsx`, `StoryTabs.tsx`, `SpaceStory.tsx`(2026-07-14 감사가 지목) — 파일 자체가 이미 삭제되어 존재하지 않음. **문제 없음.**
- 더미 데이터(`dummyNotes.ts`) — 커밋 `a2089f8`에서 참조까지 함께 완전히 제거됨. **문제 없음.**

### 4. 연결이 끊긴 코드
- `/operator` 서브트리 전체와 `/space/[slug]/waitlist`가 인앱 링크 없이 URL 직접 접근 전제(P2-2).
- `/space/[slug]/complete`는 `GuestbookCanvas.tsx:503` 단 한 경로로만 진입 가능한데, `RecordForm.tsx`는 항상 방명록 페이지로만 보내 방명록을 건너뛴 방문자는 완료 페이지에 도달 불가 — 의도된 흐름인지 불확실.

### 5. 오래된 MVP 기능 잔재
- `prisma/schema.prisma:412`의 `SC-0001` 주석(P1-5).
- `spaceUnlock.test.ts`의 테스트 픽스처가 전부 `"SC-0001"` — 기능엔 문제 없으나 새 명명 규칙 미반영.
- 두 태그 시스템 병행(P2-4).
- 전역 `loading.tsx`의 영문 플레이스홀더 톤(P2-5).

### 6. 불필요한 데이터 모델과 API
- `episodes/[episodeId]/read/route.ts`(P1-2) 외에 진짜 "불필요한" API는 발견되지 않음 — 2026-07-14 감사가 지목한 `/api/stories`, `/api/tags`의 GET은 애초에 존재한 적이 없고(POST만 정의됨) 그 POST들은 실사용 중이며, `/api/operator/spaces`, `.../report`, `.../guestbook`, `.../guestbook/archive`는 폴더 자체가 없음. **이 항목들에 대한 과거 감사 기록은 폐기하십시오.**
- 데이터 모델 자체의 완전한 불용은 없음. `GuestbookSettings`/`GuestbookSession`은 개념이 겹치지 않는 별개 모델로 확인됨.

### 7. 권한 중복 또는 충돌
- 같은 `GuestbookSession` 리소스에 대한 배타적 인가 축(P2-3).
- 관리자 게이트의 null 체크 필드 불일치: `api/spaces/[id]/route.ts:11`은 `session?.user?.email`로, `api/spaces/route.ts:10`은 `session?.user?.id`로 먼저 체크. `isAdmin` 자체가 이메일 기반이라 최종 결과는 같지만, 이메일이 없는 카카오 계정에서 401/403이 라우트마다 다르게 갈릴 수 있음. 사용자 식별 자체(`session.user.id` 기반 조회)는 이미 전면 전환 완료 — 이 게이트 부분만 남은 잔재.
- `operatorAuth.requireSpaceAccess`(과거 감사가 언급) — 파일도 함수도 존재하지 않음, 완전히 정리됨. 다만 `spaceUnlock.ts:176`, `guestbook-sessions/active/route.ts:16` 주석이 이 죽은 이름을 여전히 언급.

### 8. 비슷한 유틸 함수의 반복
- 날짜 포맷(위 1번 참고).
- hex 색상 검증/클램프, `getBaseUrl`/큐브 URL 생성, rate limit — 전부 단일 출처 확인, **문제 없음.**

### 9. 접근할 수 없는 페이지
- `/operator/**`, `/space/[slug]/waitlist`(P2-2, 인앱 링크 없음이지만 URL 전달 전제 설계로 보임 — "접근 불가"라기보다 "발견 불가"에 가까움).
- 그 외 동적 라우트는 전부 상위 목록 페이지에서 정상적으로 링크가 생성됨(9개 동적 라우트 전수 확인).

### 10. 현재 구조와 맞지 않는 명칭
- `/owner/**` = 사실상 admin(P2-1) — 가장 비중 있는 항목.
- `/owner/[id]/qr` — "큐브 QR 일원화" 이후에도 이름은 옛 URL-직결 QR 개념 그대로.
- `migrate-districts.ts` — 마이그레이션이 아니라 초기 시드 스크립트.
- `/owner/[id]`와 `/operator/[spaceId]` — 같은 Space를 가리키는 URL 파라미터 이름이 다름.

---

## 다음 단계 제안

이번 조사에서 나온 것 중 안전도가 높은 6건(NotePanel 삭제, 중복 API 삭제, 상수/우회식 통합, 스키마 주석 수정, cron 로그 가드, 문서 정정)은 이미 별도 백그라운드 작업으로 대기시켜뒀습니다. 나머지는 실행 전에 결정이 필요합니다.

1. **1단계(안전, 즉시 가능)**: 위 P1 8건.
2. **2단계(결정 필요)**: `/owner` → `/admin` 개명 여부, `/operator` 진입 링크를 앱 내부에 추가할지 여부, 관리자-운영자 이중 게이트를 통합할지 여부.
3. **3단계(장기)**: `Space.spaceTags` 레거시 태그 시스템을 `SpaceTag`로 완전히 이전하거나, "이전 예정" 문구를 지우고 두 체계 공존을 공식 결정으로 문서화.
