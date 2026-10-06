# Claude Code Latest Handoff

Updated: 2026-10-05

## Status

방명록 더미(샘플) 데이터 정리 — 캔버스의 "샘플" 표시 제거 + 공간별 실제 질문에 답하는 샘플 문장 28개 추가. 다른 기능 변경 없음.

## Commit

- 브랜치 `claude/dummy-guestbook-cleanup-cag5wu`의 최근 두 커밋(`git log -2`)

## Completed

- 방명록 캔버스(`GuestbookCanvas.tsx`)에서 더미 글에 붙던 "샘플" 배지와 상세 모달의 "샘플 기록 — 화면 확인용이에요…" 문구 제거.
- `scripts/seed-sample-guestbook.ts`
  - 포스트잇 이름을 "샘플" → 비로그인 방문자와 같은 고정 이름 `ANONYMOUS_NICKNAME`("익명의 방문자")로. 가짜 사용자 이름은 만들지 않음.
  - 데이터 구조를 공간별 `question1 / question2: { question, answers }` + `free`로 정리 — 질문과 그 답이 한눈에 대응. 질문 원본은 `GuestbookSession.question1/question2`(ACTIVE 세션)이고, 표의 question과 다르면 그 공간은 건너뜀(기존 동작 유지).
  - 6개 활성 공간에 4~5개씩 28개 추가(55 → 83개, 공간당 13~15개). 새 문장은 전부 질문 칸의 답(Q1 18 · Q2 10), 자유 칸은 기존 16개 그대로. 기존 55개 문장은 그대로 유지.
- 내부 구분은 그대로: 작성자 `User.isDemo`(sample-guestbook@spacecube.local), `guestbookAuthorFilter` / `previewGuestbookSamples`, KPI · 리포트 · 퍼널 · 추천 제외, 관리자 방명록 목록의 SAMPLE 배지(관리자 화면 전용), `GuestbookNoteData.sample` 플래그(렌더링만 안 함).

## Key files changed

- `src/app/space/[slug]/guestbook/GuestbookCanvas.tsx`
- `scripts/seed-sample-guestbook.ts`
- 주석만: `src/app/space/[slug]/guestbook/canvasConstants.ts`, `src/app/space/[slug]/guestbook/page.tsx`, `src/lib/demoData.ts`

## DB / schema

- Changed: no
- 운영 DB에는 아무것도 실행하지 않음. 반영하려면 `npx tsx --env-file=.env scripts/seed-sample-guestbook.ts --apply` (이 작성자 글만 지우고 다시 만듦 — 실제 글은 읽기만).

## Verification

- TypeScript: `tsc --noEmit` 통과
- Tests: vitest 60 files / 587 tests 통과
- Lint: 변경 파일 eslint 통과
- Seed: 임시 로컬 Postgres(공간 6개 + 실제 글 각 1개 fixture)에서 dry-run 83개, `--apply` 두 번 실행해도 83개(멱등), 실제 글 6개 변경 없음, 더미 글 전부 isDemo 작성자 · "익명의 방문자", 배치 실패 없음. `--cleanup` 미리보기 정상.
- Browser/mobile checks: 미실시(배지 · 문구 두 곳 삭제뿐)

## Problems found

- 없음

## Decisions needed

- 더미 글은 지금도 **관리자 · 로컬 개발 미리보기에서만** 보이고, 일반 방문자 화면에는 나오지 않는다(PRODUCT_DECISIONS "Do not create fake public engagement…"). 이번 작업에서 이 노출 범위는 바꾸지 않았다. 일반 방문자에게도 보이게 할지는 별도 결정 필요.
