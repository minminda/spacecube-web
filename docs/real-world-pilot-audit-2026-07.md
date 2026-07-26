> ⚠️ **2026-07-26 재감사 결과 이 문서도 상당 부분 stale합니다.** "운영자 계정연결 UI 없음"(B2)은
> PIN 인증 도입으로, "방명록 모더레이션 부재"(B3)는 운영자 숨김/소프트삭제 도입으로 이미 해소됐고,
> `operatorAuth.requireSpaceAccess`(§B2, §B3에서 언급)는 현재 코드베이스에 존재하지 않습니다(PIN
> 기반 `operatorSession.ts`로 완전 교체). 실 DB 스냅샷(§큐브 배정 수, 세션 상태 등)도 조사 시점의
> 값이라 지금과 다를 수 있습니다. 최신 근거는 `docs/project-audit-2026-07-26.md`를 사용하세요.
> 아래 내용은 2026-07-16 시점 스냅샷으로 히스토리 보존 목적으로만 남깁니다.

# 공간큐브 실사용 파일럿 감사 (2026-07-16)

> 전제 시나리오: 실제 공간(망원 14곳)에 큐브를 설치하고, 각 공간 운영자에게 큐브를 **한 달간 맡겨** 실사용 테스트한다.
> 목적: 기능 추가가 아니라 **제거·단순화·안정화** 관점에서 "지금 설치해도 되는가"를 판단한다.
> 방법: 코드·실제 DB 데이터를 직접 확인. 칭찬이 아니라 실제 서비스 기준의 냉정한 평가.

---

## 0. 감사 범위에서 실제로 확인한 것

- 전체 사용자 흐름: QR 진입(`/c/[code]` → `/api/cube-entry/[code]`) → 공간 페이지 → Episode → 취향 점수 → 방명록 → 추천(`/complete`) → 아카이브
- 12시간 공간 잠금·재방문 판정(`src/lib/spaceUnlock.ts`, `src/lib/visit.ts`)
- Episode 해제 상태(`src/lib/episodeState.ts`, `EpisodeSection.tsx`)
- 방명록 방문 단위 작성·공감·질문 군집·세션 전환(`api/guestbook/*`, `guestbookSession.ts`)
- 추천 TOP3·지역 페이지 잠금 UX(`discover/page.tsx`, `SpaceDiscoveryCard.tsx`)
- 관리자 공간·지역·방명록·리포트 관리(`/owner/*`)
- 운영자 월간 리포트(`/operator`, `api/cron/monthly-reports`)
- 권한(admin/operator/user): `admin.ts`, `operatorAuth.ts`
- **실제 DB 데이터 스냅샷**(아래 §데이터 확인)
- 예외 처리(재방문 중복, bfcache, 좌표 충돌, 중복 제출), 개인정보/부적절 콘텐츠 대응, 환경변수·배포·마이그레이션

### 실제 DB 데이터 확인 (2026-07-16 시점)

| 항목 | 값 | 비고 |
|---|---|---|
| 공간(Space) | 14개, 전부 active, 전부 이미지 있음, 전부 district=망원 | 실데이터, 더미 아님 |
| **큐브(Cube)** | **1개(SC-0001), 상태 UNASSIGNED** | ⚠️ **어떤 공간에도 연결 안 됨** |
| 지역(District) | 4개 (망원 ACTIVE / 서촌·북촌·성수 COMING_SOON) | 정상 |
| 방명록 세션 | ACTIVE 14 / ARCHIVED 7 / DRAFT 1 | 전 공간 ACTIVE 세션 보유(마이그레이션 결과) |
| Episode | published 16 / unpublished 1 | 정상 |
| Record / Note / User / Scan | 54 / 16 / 10 / 97 | 실사용 흔적 있음, 더미 없음 |
| 월간 리포트 | 1건, reportEnabled 공간은 14곳 중 **1곳뿐** | 파이프라인 실검증 안 됨 |
| Space.district ↔ District.name | 불일치 0건 | 지도 매칭 정상 |
| 더미 데이터(`dummyNotes` 등) | **완전히 제거됨** | 이전 감사의 P1 해소 |

---

## 1. 현재 실사용 준비도 점수: **60 / 100**

엔지니어링 품질은 높다(잠금·재방문·방문단위 방명록·추천 로직이 단일 판정 지점으로 잘 정리돼 있고, 예외 처리도 촘촘함). 그러나 **"물리적 설치 + 운영자 위탁"이라는 이번 시나리오의 준비도는 별개**다. 지금 상태로 큐브를 설치하면:

- 방문자가 QR을 찍어도 **어떤 공간도 열리지 않는다**(연결된 큐브 0개).
- 운영자에게 **월간 리포트가 메일로 가지 않는다**(발송 로직·스케줄 둘 다 없음).
- 운영자가 자기 공간의 **부적절한 방명록을 지울 수 없다**(작성자 본인만 삭제 가능).
- 운영자가 `/operator`에 접근하려면 **관리자가 DB를 손으로 고쳐야 한다**(계정 연결 UI 없음).

핵심 경험 설계는 72점(이전 기획 리뷰)이지만, **설치·위탁 운영 관점의 준비도는 60점**. 아래 Blocker를 풀면 실측 준비도가 80점대로 올라간다.

---

## 2. 반드시 수정해야 하는 Blocker (설치 전 필수)

### B1. 물리 큐브가 하나도 배정돼 있지 않다 — QR 흐름 전체가 죽어 있음
- **현상**: DB에 큐브가 `SC-0001` 1개뿐이고 그마저 `UNASSIGNED`. 14개 공간 전부 `space.cube = null`.
- **현장에서 벌어지는 일**: 방문자가 공간에서 QR을 찍음 → `/c/[code]`가 "유효하지 않은/연결 안 된 큐브" 안내만 표시 → **공간 이야기·방명록이 절대 안 열림**. 취향 점수 저장도 403(`requireSpaceUnlock` 실패). 관리자/운영자 본인만 bypass로 열려서 "나는 되는데 손님은 안 되는" 상태를 눈치 못 챌 위험이 크다.
- **왜 치명적인가**: 12시간 잠금·Episode·방명록·추천 등 이 서비스의 **모든 잠금 콘텐츠가 Cube QR 스캔 1회에 의존**한다. 큐브 없이는 서비스의 90%가 작동하지 않는다.
- **수정**: `/owner/cubes`에서 공간 수(14개)만큼 큐브를 생성 → 각 공간에 assign → `/owner/[id]/qr`(또는 `/owner/cubes/print`)에서 QR 인쇄 → 물리 설치. 설치 후 **관리자가 아닌 별도 계정(시크릿창)으로 실제 스캔 1회**를 반드시 검증(관리자 bypass 때문에 관리자 계정으로는 검증이 안 됨).
- **파일**: `src/app/owner/cubes/CubeManager.tsx`, `src/app/api/cubes/route.ts`, `src/app/api/cubes/[id]/assign/route.ts`, `src/lib/spaceUnlock.ts`

### B2. 운영자 계정 연결 UI가 없다 — `/operator` 접근이 수작업 의존
- **현상**: `POST /api/spaces`가 `ownerId`를 **공간을 생성한 관리자 자신**으로 고정한다(`src/app/api/spaces/route.ts:52`). 실제 공간 운영자의 Google 계정을 `Space.ownerId`로 연결하는 UI가 어디에도 없다. `SpaceForm`의 "운영자 한마디"(ownerName/ownerBio/ownerPhoto)는 **표시용 텍스트일 뿐 계정 연결이 아니다**.
- **현장에서 벌어지는 일**: 운영자가 `/operator`에 로그인해도 `resolveOperatorSpaces`가 "ownerId=본인"인 공간을 못 찾아 **"현재 연결된 공간이 없습니다"**만 뜬다. 월간 리포트·방명록 열람 등 위탁 운영의 핵심 화면 전체가 막힌다.
- **수정(최소)**: 관리자가 공간별로 운영자 이메일을 입력하면 해당 `User.id`를 `Space.ownerId`로 연결하는 관리자 액션 하나 추가(신규 화면 없이 `/owner/[id]/edit`에 필드 1개 + `PATCH /api/spaces/[id]`에 분기). 파일럿 규모(14곳)면 임시로 DB 직접 업데이트도 가능하지만, **한 달 위탁이면 운영 중 재배정이 생기므로 UI가 사실상 필수**.
- **주의**: 운영자는 자기 계정으로 **최소 1회 로그인해야 `User` 행이 생긴다**(NextAuth). 로그인 전에는 연결할 대상 id가 없다 → "운영자 먼저 로그인 → 그다음 관리자가 연결" 순서를 운영 체크리스트에 명시.
- **파일**: `src/lib/operatorAuth.ts`, `src/app/api/spaces/route.ts`, `src/app/owner/SpaceForm.tsx`, `src/app/api/spaces/[id]/route.ts`

### B3. 방명록 모더레이션 부재 — 운영자/관리자가 부적절 글을 못 지운다
- **현상**: `DELETE /api/guestbook/[id]`가 `note.userId !== user.id`면 무조건 403(`src/app/api/guestbook/[id]/route.ts:72`). **작성자 본인만 삭제 가능**. 관리자·운영자·공간 owner에게 삭제/숨김 권한이 전혀 없다. 신고 기능도 없다.
- **현장에서 벌어지는 일**: 누군가 공개 방명록 벽에 욕설·비방·홍보·개인정보를 적으면, 운영자는 자기 공간 벽인데도 **손 쓸 방법이 없다**. 작성자가 지우지 않는 한 한 달 내내 남는다. 오프라인 매장 벽에 붙는 콘텐츠라 평판 리스크가 직접적이다.
- **수정(최소)**: DELETE 권한에 `isAdmin(email) || space.ownerId === user.id`를 OR로 추가(엔드포인트·인가 패턴은 이미 `operatorAuth.requireSpaceAccess`에 있음, 재사용). UI는 운영자 방명록 열람 화면(`GuestbookBrowser.tsx`)에 "숨기기" 버튼 하나면 충분. 신고 기능까지는 이번 파일럿 범위 밖.
- **파일**: `src/app/api/guestbook/[id]/route.ts`, `src/app/operator/GuestbookBrowser.tsx`, `src/lib/operatorAuth.ts`

### B4. 월간 리포트가 운영자에게 실제로 전달되지 않는다
- **현상**: (1) **발송 로직 없음** — `api/cron/monthly-reports/route.ts`는 리포트를 생성만 하고 `console.log`로 payload를 찍을 뿐, 이메일/문자를 보내지 않는다(nodemailer/resend 등 발송 라이브러리 자체가 프로젝트에 없음). (2) **스케줄 없음** — `vercel.json`이 없어 이 cron이 자동 실행되지 않는다. (3) reportEnabled 공간이 14곳 중 1곳뿐이라 파이프라인이 실데이터로 검증되지도 않았다.
- **현장에서 벌어지는 일**: "한 달 뒤 운영자에게 리포트가 간다"가 이번 테스트의 핵심 약속인데, **아무 일도 안 일어난다**. 운영자는 `/operator`를 스스로 찾아 들어와야 리포트를 본다(그마저 B2 때문에 막힘).
- **수정(현실적 선택)**:
  - **옵션 A(권장, 저비용)**: 자동 발송을 이번 파일럿에서 **명시적으로 빼고**, "매월 관리자가 `/operator`(또는 `/owner/[id]/report`)를 열어 링크/PDF를 수동 전달"로 운영 정의. 코드 변경 0, 대신 운영 체크리스트에 못박기.
  - **옵션 B**: Resend 등 1개 붙이고 `vercel.json`에 cron 등록. 단, `react-dom/server`를 Route Handler에서 import 금지 제약이 있으므로(문서화됨) 발송은 별도 함수에서 렌더링해야 함 — 파일럿에 넣기엔 과함.
- **파일**: `src/app/api/cron/monthly-reports/route.ts`, `src/lib/monthlyReport.ts`, `src/components/ReportEmail.tsx`, (없음)`vercel.json`

### B5. 신규 공간에 ACTIVE 방명록 세션이 자동 생성되지 않는다
- **현상**: `POST /api/spaces`는 공간만 만들고 방명록 세션을 부트스트랩하지 않는다. 기존 14곳은 마이그레이션(`migrate-guestbook-sessions.ts`)이 ACTIVE 세션을 넣어줘서 지금은 문제없지만, **파일럿 중 새 공간을 추가하면** 그 공간은 방문자가 방명록을 쓰려는 순간 "현재 진행 중인 방명록이 없습니다"(403)로 막힌다.
- **현장에서 벌어지는 일**: 파일럿 중 공간 1곳 추가 → 손님이 방명록 시도 → 막힘 → 관리자가 `/owner/[id]/guestbook`에서 세션을 수동 생성해야 함을 아무도 모름.
- **수정**: 공간 생성 시 자유 군집만 있는 ACTIVE 세션 1개를 같은 트랜잭션에서 생성. 또는 **파일럿 중 신규 공간 추가 금지**를 운영 룰로 정하면 코드 변경 없이 회피 가능(14곳 고정이면 이 경로가 더 단순).
- **파일**: `src/app/api/spaces/route.ts`

---

## 3. 테스트 전 수정 권장 (Blocker는 아니지만 현장 마찰)

### R1. 방명록 이미지 업로드가 무서명·무검증
- Cloudinary **unsigned upload preset**(`GuestbookCanvas.tsx:56`)에 클라이언트/서버 **크기·타입·개수 제한이 전혀 없다**. 로그인 사용자면 임의 이미지를 방명록에 올릴 수 있고 서버 검증이 없다. 부적절 이미지 + 삭제 불가(B3)가 겹치면 리스크가 커진다.
- **수정(최소)**: 파일럿 동안 `GuestbookSettings.allowImage`를 공간별로 **꺼두기**(스키마·UI 이미 존재, 기본값만 false로 운영)가 가장 저비용. 유지한다면 클라이언트에서 `file.size`·MIME 체크 추가.
- **파일**: `src/app/space/[slug]/guestbook/GuestbookCanvas.tsx`, `GuestbookSettings`(prisma)

### R2. slug 데이터 위생 문제
- 실데이터에 `뮤직컴플렉스`의 slug가 **`"-"`**, `다시점 `은 이름 끝에 공백. QR/공유 링크가 `/space/-`가 되고, 향후 다른 공간이 `"-"`를 다시 쓰면 unique 충돌로 저장 실패. `OUTHOUSE`(대문자)/`buk` 등 일관성도 낮음.
- **수정**: 설치 전 slug를 사람이 읽을 수 있는 값으로 교정(예: `music-complex`). 큐브 QR은 slug가 아니라 큐브 code로 도는 구조라 잠금 흐름엔 영향 없지만, 공유/OG 링크 품질과 미래 충돌 방지 차원.
- **파일**: DB 직접 수정 또는 `/owner/[id]/edit`

### R3. "나만의 기록"(memo)이 UI에서 수집되지 않음
- `RecordForm.tsx`는 `tasteScore`만 전송한다(memo 필드 없음). API·스키마는 memo를 받지만(`api/records/route.ts:19`) 폼에 입력창이 없어 **개인 메모가 한 줄도 안 남는다**. 이전 기획 리뷰의 P0#1이 여전히 미해소.
- **현장 영향**: "공간을 기록한다"는 가치 제안의 절반(점수 말고 텍스트 회고)이 비어 있음. 파일럿의 핵심 가설(§7)이 "사람들이 기록을 남기는가"라면 이건 측정 자체를 막는다.
- **판단**: 기능 추가라 이번 "제거·안정화" 스코프와는 상충. 다만 **파일럿 가설이 기록 행동이라면 입력창 1개는 넣는 게 맞다**(1시간 규모). 아니라면 명시적으로 "이번 파일럿은 점수만 측정"으로 못박기.
- **파일**: `src/app/space/[slug]/record/RecordForm.tsx`

### R4. 관측성(observability) 부재
- Sentry 등 에러 추적 없음, 구조적 로깅 없음(`console.log` 1곳). 미들웨어·레이트리밋 없음. 한 달 무인 운영 중 장애가 나면 **무엇이 깨졌는지 알 방법이 Vercel 함수 로그를 직접 뒤지는 것뿐**.
- **수정(최소)**: 파일럿이면 Sentry 무료 티어 1개 연결이 가성비 최고(에러 자동 수집). 최소한 `/api/cube-entry`·`/api/records`·`/api/guestbook` 실패 경로에 식별 가능한 로그 태그라도 남기기.

### R5. Episode/콘텐츠가 없는 공간의 빈 화면
- 공간 페이지는 `episodes.length > 0`일 때만 Episode/잠금 안내를 렌더한다(`space/[slug]/page.tsx:240`). Episode도 owner note도 없는 공간은 **이미지+이름+태그라인+CTA만** 남아 "잠긴 이야기가 있다"는 신호조차 안 뜬다. 설치 전 14곳 각각 최소 Episode 1개 발행 여부 점검 필요(현재 published 16개가 14곳에 고르게 있는지 확인).

---

## 4. 한 달 테스트에서는 빼도 되는 기능 (제거·단순화 후보)

이번 시나리오의 성공 기준(설치→방문→기록→방명록→재방문)에 **직접 기여하지 않으면서 표면적/운영 부담만 늘리는** 것들:

| 대상 | 상태 | 권장 |
|---|---|---|
| 자동 이메일/문자 발송 | 미구현(B4) | 파일럿에서 **명시적 제외**, 수동 전달로 정의 |
| 방명록 이미지 첨부 | 무검증(R1) | 파일럿 동안 **off** |
| 반응 보드(dashboard, spaceInsight) | `SHOW_REACTION_BOARD=false`로 이미 숨김 | 유지(그대로 둠) |
| 지역/취향 이야기(ContentStory) | `ENABLE_*_STORIES=false` | 유지(그대로 둠) |
| 다국어(공간 다국어 번역) | 방명록/기록/알림 UI는 100% 한국어 | 파일럿 대상이 한국 손님이면 **공간별 multilingual off**로 단순화 |
| 태그 기반 추천(`ENABLE_RECORD_TAG_SELECTION`) | false, tasteScore로 대체됨 | 유지(켜지 말 것) |
| 알림(NotificationBell) | 아카이브 상단에만 존재, 진입점 얇음 | 유지하되 파일럿 지표에서 제외 |

**원칙**: 위는 대부분 **플래그로 이미 꺼져 있거나 끌 수 있다**. 새 코드 삭제 없이 "파일럿 프로파일"(이미지 off, 다국어 off, 자동발송 제외)로 운영 정의만 하면 된다.

---

## 5. 유지해야 하는 핵심 기능 (이번 테스트의 뼈대)

- **Cube QR → 12시간 공간 잠금 → 재스캔 재해제**: 서비스 정체성. 단일 판정 지점(`spaceUnlock.ts`)으로 잘 설계됨. 절대 건드리지 말 것.
- **취향 점수(tasteScore 1~5) 기록 + 재방문 12시간 dedup**: `api/records` 서버측 재방문 판정이 새로고침/중복을 막음. 견고.
- **방문 단위 방명록 작성(recordId 기준) + 좌표 충돌 검사 + 공감**: 트랜잭션·유니크 제약·P2002 캐치까지 방어적으로 구현됨. 핵심 정서 경험.
- **Episode 방문횟수 기반 해제(영구) + 4상태 UX**: 재방문 동기의 핵심. Record 누적 기반이라 재잠금과 독립적으로 유지됨.
- **추천 TOP3 + discover 지역 잠금 카드(큐브 오버레이)**: 다음 방문 유도. 잠금 UX 최근 정리됨.
- **권한 3계층(admin/operator/user)**: `isAdmin` + `ownerId` 인가가 서버측에서 재검증됨(클라이언트 spaceId 불신). 견고. 단 B2(계정 연결)만 뚫으면 됨.

---

## 6. 실제 운영 체크리스트 (설치 당일까지)

**설치 전 (관리자)**
- [ ] 14개 공간 각각에 큐브 생성·assign (`/owner/cubes`) — **B1**
- [ ] 각 큐브 QR 인쇄(`/owner/cubes/print`), 물리 부착
- [ ] **시크릿창(비관리자 계정)으로 각 공간 QR 실제 스캔 1회** → 잠금 해제·방명록 작성까지 end-to-end 확인 (관리자 bypass 때문에 관리자 계정 검증은 무효)
- [ ] 각 공간 운영자에게 "먼저 Google 로그인 1회" 요청 → 그다음 `Space.ownerId` 연결 — **B2**
- [ ] `/operator`로 운영자가 자기 공간을 볼 수 있는지 운영자 계정으로 확인
- [ ] 14곳 각 ACTIVE 방명록 세션 존재 확인(현재는 있음) + 파일럿 중 신규 공간 추가 금지 룰 공지 — **B5**
- [ ] slug 위생 교정(`-`, 끝 공백 등) — **R2**
- [ ] 공간별 방명록 이미지 첨부 off, 다국어 off(한국 손님 전제) — **R1**
- [ ] Episode/owner note 없는 빈 공간 없는지 점검 — **R5**
- [ ] 방명록 부적절 글 삭제 경로 확보(운영자 삭제 권한) — **B3** (미구현이면 "관리자 수동 DB 삭제"를 임시 SOP로)

**환경변수/배포**
- [ ] `DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, AUTH_URL, ADMIN_EMAIL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_CLOUDINARY_*` 프로덕션 세팅 확인(`.env.example` 기준)
- [ ] `AUTH_SECRET` 프로덕션 값 존재 확인 — 없으면 pending-unlock 토큰 서명이 예외를 던져 **비로그인 스캔→로그인 흐름이 깨짐**(`spaceUnlock.ts:31`)
- [ ] `npm run db:migrate-districts` 프로덕션 1회 실행(지도 지역 시드) — 안 하면 둘러보기 지도가 빈 화면
- [ ] 월간 리포트 자동발송은 **이번 파일럿 제외**로 문서화(또는 vercel.json+발송 연동, 권장 안 함) — **B4**

**장애 확인 방법**
- [ ] Vercel 함수 로그 접근 경로 확보 / (권장) Sentry 무료 티어 연결 — **R4**
- [ ] "QR 안 열림" 신고 시 1차 진단 순서 정의: 큐브 status(ASSIGNED?) → space.isActive → 사용자 로그인 여부 → SpaceUnlock 행 존재/12h 경과

---

## 7. 한 달 테스트 가설과 측정 지표

| # | 가설 | 측정 지표 | 데이터 출처 |
|---|---|---|---|
| H1 | 손님이 QR을 실제로 스캔한다 | 공간별 스캔 수, 스캔→로그인 전환율 | `SpaceScan`(cubeId별), `Record` 생성 수 |
| H2 | 스캔한 사람이 취향 점수를 남긴다 | 스캔 대비 Record 생성률, 평균 tasteScore | `Record.tasteScore` |
| H3 | 기록한 사람이 방명록 흔적을 남긴다 | Record 대비 GuestbookNote 작성률 | `guestbookRate`(월간 리포트) |
| H4 | 12시간 잠금이 재방문을 유도한다 | 재방문율(12h 정책 기준 2회+ Record 사용자) | `revisitRate`(월간 리포트) |
| H5 | Episode 해제가 재방문 보상으로 작동한다 | Episode 조회 수 vs 신규 해제 수의 괴리 | `reportMetrics.ts`(episodeViews, newlyUnlockedEpisodes) |
| H6 | 운영자가 리포트를 실제로 열어본다 | `/operator` 접근 로그(운영자 계정) | (관측성 필요 — R4) |

**측정 인프라 주의**: 방명록 "진입 수", 추천 "노출/클릭" 수는 **추적 코드가 아예 없다**(월간 리포트 리스트럭처 메모에 "아직 수집하지 않습니다"로 명시됨). H1~H5는 기존 테이블로 측정 가능하지만, **H6과 추천 퍼널은 최소한의 이벤트 로깅 없이는 측정 불가**. 파일럿 시작 전 이 지표를 포기할지, 가벼운 로깅을 붙일지 결정 필요.

---

## 8. 우선순위별 실행 계획

### 설치 전 필수 (이거 없으면 파일럿이 성립 안 함)
1. **B1** 큐브 14개 생성·assign·인쇄·부착 + 비관리자 계정 실스캔 검증
2. **B2** 운영자 계정 연결(최소 관리자 액션 1개 또는 DB 직접) — `/operator` 접근 확보
3. **B4** 자동발송을 파일럿에서 **명시적 제외**로 정의(수동 전달 SOP) — 코드 변경 0
4. `db:migrate-districts` 실행, `AUTH_SECRET` 등 env 확인, slug 교정(R2)
5. 운영 프로파일 확정: 이미지 off(R1), 다국어 off, 신규 공간 추가 금지(B5)

### 설치 후 1주 내 (초기 데이터로 검증·보정)
1. **B3** 운영자/관리자 방명록 삭제 권한 추가(부적절 글 실제로 나오기 전에) — 인가 패턴 재사용, 소규모
2. **R4** Sentry 또는 최소 로깅 연결(1주 무인 운영 전에)
3. H1~H4 지표가 실제로 쌓이는지 첫 리포트 수동 생성(`/owner/[id]/report` "생성" 버튼)으로 확인 — reportEnabled를 14곳으로 확대
4. (파일럿 가설이 "기록 행동"이면) **R3** memo 입력창 1개 추가

### 한 달 후 판단 (이 데이터로 다음을 결정)
1. H2/H3 전환율로 "점수만 vs 점수+메모", "방명록 존치 여부" 결정
2. H4/H5로 12시간 잠금·Episode 보상의 재방문 기여 검증 → 잠금 시간(현재 12h) 튜닝
3. 자동 리포트 발송(B4 옵션B)·추천 퍼널 로깅에 투자할지, 계속 수동으로 갈지 결정
4. 다국어·이미지·알림 등 "이번에 끈 것"들의 부활 우선순위

---

## 9. 관련 파일과 수정 위치 (요약)

| ID | 파일 | 수정 포인트 |
|---|---|---|
| B1 | `owner/cubes/CubeManager.tsx`, `api/cubes/*` | 데이터 작업(코드 아님): 큐브 생성·assign |
| B2 | `api/spaces/route.ts:52`, `api/spaces/[id]/route.ts`, `owner/SpaceForm.tsx`, `lib/operatorAuth.ts` | ownerId를 운영자 계정으로 연결하는 관리자 액션 |
| B3 | `api/guestbook/[id]/route.ts:72`, `operator/GuestbookBrowser.tsx` | DELETE 인가에 admin/owner OR 추가 + 숨기기 버튼 |
| B4 | `api/cron/monthly-reports/route.ts`, (없음)`vercel.json` | 파일럿 제외 문서화(권장) 또는 발송 연동 |
| B5 | `api/spaces/route.ts` | 공간 생성 트랜잭션에 ACTIVE 세션 부트스트랩 |
| R1 | `space/[slug]/guestbook/GuestbookCanvas.tsx:56`, `GuestbookSettings` | allowImage off 또는 size/MIME 검증 |
| R2 | DB / `owner/[id]/edit` | slug 교정(`-`, 끝 공백) |
| R3 | `space/[slug]/record/RecordForm.tsx` | memo 입력창(선택) |
| R4 | (전역) | Sentry/로깅 |
| R5 | `space/[slug]/page.tsx:240` | Episode 없는 공간 점검(데이터) |
| env | `.env.example`, (없음)`vercel.json` | `db:migrate-districts` 실행, AUTH_SECRET 확인 |

---

## 10. 최종 판단: **조건부 가능 (Conditional Go)**

**"지금 이 순간 큐브를 붙이면" → 불가.** 연결된 큐브가 0개라 QR 흐름 전체가 죽어 있고(B1), 운영자가 자기 화면에 못 들어가며(B2), 부적절 글을 못 지운다(B3).

**그러나 이 셋은 전부 "며칠 내 데이터·소규모 수정"으로 풀 수 있고, 나머지 코어(잠금·재방문·방명록·추천·권한)는 견고하게 완성돼 있다.** 따라서:

> **B1(큐브 배정+실스캔 검증) · B2(운영자 계정 연결) · B3(운영자 삭제 권한) · B4(자동발송 파일럿 제외 명시)** 를 설치 전/직후에 처리하면 → **설치 가능.**

새 기능을 더 만들 필요는 없다. 이번 파일럿은 **"켤 것을 켜고, 끌 것을 끄고(이미지·다국어·자동발송), 큐브를 실제로 붙이고, 운영자를 연결하는"** 운영·설치 작업이 8할이다. 코드 신규 개발은 B3(소규모 인가 추가)와 선택적 R3(memo 입력창) 정도로 최소화하는 것을 권장한다.

---

*본 문서는 코드·실 DB를 직접 확인한 스냅샷이며, 코드는 수정하지 않았다. 각 항목은 설치·위탁 운영 착수 직전 재검증 후 실행할 것.*
