# Claude Code Latest Handoff

Updated: 2026-10-06

## Status

정리 · 검증 작업(새 기능 없음). 기준점: master `ea05c97`(PR #2 merge, Vercel production 배포 success).
이 handoff를 포함한 정리 커밋은 `claude/post-guestbook-cleanup` 브랜치에 있음(master 미반영).

## 방명록 샘플(더미) — 현재 production 동작(코드 기준)

- 방문자 노출: `/space/[slug]/guestbook`(QR 접근 확인 후) · 이전 방명록에서 `guestbookVisibleAuthorFilter` → 실제 글 + 샘플 계정(`sample-guestbook@spacecube.local`, User.isDemo) 글. 다른 더미 계정 글은 실제 공간에서 숨김.
- 표시: 캔버스에 샘플 배지 · 안내 문구 없음. 이름은 `guestbookDisplayNickname`으로 "익명의 방문자", userId 미전송(아카이브 링크 없음). 관리자 방명록 목록만 SAMPLE.
- 집계 제외: KPI · 리포트 · 퍼널(`getKpiExcludedUserIds`), 운영자 화면 · 포스트잇 수 · 보상(`REAL_GUESTBOOK_NOTE_WHERE`), 리포트 공감 수(샘플 글 공감 제외), 추천 · 공개 프로필(isDemo).
- 자동 seed: `package.json` postbuild → `scripts/vercel-sync-sample-guestbook.mjs` → `VERCEL_ENV=production`일 때만 `seed-sample-guestbook.ts --apply`. 실패 · 180초 초과도 exit 0(배포 영향 없음).
- seed 대상: `isActive && !isDemo` + ACTIVE 세션. 답은 `scripts/sample-guestbook-answers.ts`(질문 문장 키, 15개 질문 × 12). 보이는 질문이 없으면 그 공간은 건너뜀(로그). 질문 칸에만, 공간당 12개.
- 중복 방지: 공간별 `pg_advisory_xact_lock` 트랜잭션 안에서 재계산, 기존 (칸, 문장)은 재생성 안 함.
- 실제 데이터: 생성 · 삭제 · 이름 변경은 샘플 작성자 글만. 질문에 안 맞는 예전 샘플은 공감 · 댓글 · 알림 · 리포트 선정이 없을 때만 삭제.

## 이번 정리

- 주석: "UI 검증용 샘플" 등 옛 설명을 현재 정책으로(GuestbookEditor, GuestbookNoteManager, admin/operator guestbook page, guestbookReward), seed 헤더에 자동 실행 · 잠금 · 이름 정리 범위 추가.
- 미사용 import 제거: `GuestbookEditor.tsx`의 `DEFAULT_CANVAS_SETTINGS`.
- `docs/PRODUCT_DECISIONS.md` Sample/demo data에 방명록 샘플 예외 정책 추가.
- 원격 브랜치 삭제: `claude/guestbook-dummy-public`, `claude/guestbook-dummy-autoseed`(master에 포함, 고유 커밋 0).

## DB / schema

- Changed: no. DB 작업 없음.

## Verification

- TypeScript 통과 / vitest 61 files · 599 tests 통과 / 변경 파일 eslint 통과
- Build: `prisma generate` + `next build` 성공(DB를 쓰는 `prisma db push` · postbuild seed는 로컬에서 실행 안 함)
- 전체 `eslint`: 기존부터 있던 14건(에러 12 · 경고 2) — 방명록과 무관(WaitlistPanel, admin dashboard/stories, recommendation, RecordForm, OnboardingOverlay, RecommendationPlaylist, StoryReadTracker, ThemeToggle)

## Problems found

- 운영 DB · Vercel 빌드 로그를 이 환경에서 볼 수 없어 production seed 결과(대상 공간 · 공간별 개수)는 미확인. 빌드 로그 `[sample-guestbook]` 줄에 남음.
- 남은 원격 브랜치(삭제 안 함, master에 없는 커밋 있음): `claude/dummy-guestbook-cleanup-cag5wu`(2, 폐기된 이전 작업), affectionate-cartwright-739379(48), brave-elbakyan(23), compassionate-satoshi-d940ed(183), fervent-wilbur-436de5(38), hungry-ride-8ae6a1(47), quizzical-mendel-d05756(28), xenodochial-chatterjee(25).
- `docs/CLAUDE_TASK.md`는 이미 끝난 드롭다운 작업 내용 그대로(수정 시 자동 dispatch 워크플로가 돌아서 건드리지 않음).

## Decisions needed

- 이 정리 브랜치를 master에 merge할지.
- 고유 커밋이 남은 오래된 Claude 브랜치들을 보관할지 삭제할지.
