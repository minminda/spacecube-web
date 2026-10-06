# Claude Code Latest Handoff

Updated: 2026-10-06 (자동 seed 추가)

## Status

방명록 샘플(더미)을 일반 방문자에게도 보이게 하고, 운영 중인 공간에 현재 질문에 답하는 샘플을 공간당 12개까지 채우는 seed로 정리.
master(318ecf9) 기준 새 브랜치 `claude/guestbook-dummy-public`. 이전 `claude/dummy-guestbook-cleanup-cag5wu` 작업은 사용하지 않음.

## Commit

- 브랜치 `claude/guestbook-dummy-public`의 최신 커밋(`git log -1`)

## Completed

- 방문자 노출: `guestbookVisibleAuthorFilter`(src/lib/demoData.ts) — 실제 공간에서 실제 글 + 방명록 샘플 계정(`SAMPLE_GUESTBOOK_AUTHOR_EMAIL`, User.isDemo) 글만. 다른 더미 계정 글은 지금처럼 숨김.
  방명록 캔버스 · 이전 방명록 · 글 작성 시 자리 피하기(API)에 적용.
- 화면 표시 제거: 캔버스의 "샘플" 배지 · 상세 모달 안내 문구 제거, `GuestbookNoteData.sample` 필드 삭제. 샘플 글은 userId를 내보내지 않아(비로그인 글과 같음) "아카이브 둘러보기" 링크도 없음. 관리자 방명록 목록의 SAMPLE 표시만 유지.
- 집계 제외(변경 없이 유지): KPI · 월간 리포트 · 퍼널 · 운영자 화면 · 포스트잇 수 · 보상은 `getKpiExcludedUserIds` / `REAL_GUESTBOOK_NOTE_WHERE`(isDemo 기준)라 샘플이 그대로 빠짐.
  추가로 리포트 `reactionsTotal`은 샘플 글에 달린 공감을 빼도록 수정(방문자가 샘플에 공감해도 지표에 안 들어감).
- seed(`scripts/seed-sample-guestbook.ts`) 재작성:
  - 대상은 실행 시 DB에서 결정: `isActive && !isDemo` + ACTIVE 방명록 세션. 공간 목록 하드코딩 없음.
  - 답은 질문 문장 기준(`scripts/sample-guestbook-answers.ts`, 질문 15개 × 12개). 보이는 질문이 모음에 없으면 그 공간은 생성 안 하고 로그.
  - 질문 칸에만 생성, 공간당 목표 12개, 부족한 만큼만 추가(멱등). 계획 로직은 순수 함수 `src/lib/sampleGuestbookPlan.ts`.
  - 예전 샘플 중 질문과 안 맞는 글(자유 칸 · 바뀐 질문 · 중복)은 정리하되 실제 방문자 공감 · 댓글이 달린 글은 유지. 샘플 글 이름은 모두 "익명의 방문자"로.
- 배포와 seed 분리: seed는 선택 사항(빌드 · 배포에 포함 안 됨). seed를 안 돌려도 렌더링 단계에서 실제 공간의 더미 계정 글 이름을
  "익명의 방문자"로 바꿔 보여준다(`guestbookDisplayNickname` — 방명록 캔버스 · 이전 방명록). 예전 "샘플" 이름이 화면에 나오지 않음.
- PR #1로 master에 merge.

## 자동 seed(production 배포 전용)

- `package.json` "postbuild" → `scripts/vercel-sync-sample-guestbook.mjs`: `VERCEL_ENV=production`일 때만 `seed-sample-guestbook.ts --apply` 실행(Preview · 로컬은 건너뜀).
  Vercel production의 기존 `DATABASE_URL` 사용. 실패 · 180초 초과여도 로그만 남기고 exit 0(배포 계속, 다음 production 배포 때 재시도).
- seed: 공간별 `pg_advisory_xact_lock` 트랜잭션(동시 배포에도 중복 없음), 목표 12개까지 부족분만(멱등), 샘플 작성자(isDemo) 글만 생성/정리,
  이름은 "샘플"인 샘플 글만 "익명의 방문자"로, 질문에 안 맞는 예전 샘플은 공감 · 댓글 · 알림 · 리포트 선정이 없을 때만 삭제.
- 사용자 승인(2026-10-06): 배포 시 운영 DB 자동 seed 실행 허용.

## Key files changed

- `src/lib/demoData.ts`, `src/lib/sampleGuestbookAuthor.ts`(신규), `src/lib/sampleGuestbookPlan.ts`(신규)
- `src/app/space/[slug]/guestbook/page.tsx`, `GuestbookCanvas.tsx`, `canvasConstants.ts`, `archive/[sessionId]/page.tsx`
- `src/app/api/guestbook/route.ts`, `src/lib/reportMetrics.ts`
- `scripts/seed-sample-guestbook.ts`, `scripts/sample-guestbook-answers.ts`(신규)
- 테스트: `src/lib/demoData.test.ts`, `src/lib/sampleGuestbookPlan.test.ts`(신규)

## DB / schema

- Changed: no (스키마 변경 없음)
- 운영 DB에는 아무것도 실행하지 않음(이 환경에 운영 DATABASE_URL 없음). seed는 선택: `npx tsx --env-file=.env scripts/seed-sample-guestbook.ts`로 미리보기 후 `--apply`.
- seed 미실행 시: 운영 DB에 이미 있는 예전 샘플(있다면, 자유 칸 감상문 포함)이 그대로 방문자에게 보이고(이름은 익명), 공간당 12개 보강 · 새 질문 답은 생기지 않음.

## Verification

- TypeScript: `tsc --noEmit` 통과
- Tests: vitest 61 files / 599 tests 통과(신규 13개)
- Lint: 변경 파일 eslint 통과
- Seed + 쿼리: 임시 로컬 Postgres fixture(운영 공간 6 + 모르는 질문 공간 + 비공개 · 시연 · 세션 없는 공간, 실제 글 · 익명 글 · 다른 더미 계정 글 · 예전 샘플)로
  dry-run → `--apply` 2회 → 공간당 12개 고정, 비공개 · 시연 공간 미대상, 모르는 질문/세션 없음은 로그 후 건너뜀,
  방문자 필터 = 실제 + 샘플(다른 더미 제외), REAL 필터 · `getSpaceMonthlyKpi.guestbookPosts` = 실제 글만, `reactionsTotal`은 샘플 글 공감 제외, 샘플 이름 전부 "익명의 방문자".
- Browser/mobile checks: 미실시

## Problems found

- 운영 DB를 직접 볼 수 없어 실제 운영 공간 목록 · 현재 질문은 확인하지 못함 — seed 미리보기 로그로 확인 필요.

## Decisions needed

- `docs/PRODUCT_DECISIONS.md`의 "Do not create fake public engagement that is presented as real visitor activity."와 이번 요청(샘플을 표시 없이 일반 방문자에게 노출)이 충돌한다. 사용자 요청으로 구현했으니 문서 갱신 여부를 결정해야 함.
- 운영 질문이 답변 모음에 없는 공간이 있으면 `scripts/sample-guestbook-answers.ts`에 그 질문의 답을 추가해야 함.
