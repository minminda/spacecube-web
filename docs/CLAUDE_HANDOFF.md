# Claude Code Latest Handoff

Updated: 2026-10-06

## Status

방명록 캔버스에서 포스트잇이 world 경계에 잘리는 문제 수정. 브랜치 `claude/guestbook-canvas-clipping`(master `1d3fb23` 기준, 미merge).

## 원인

- 캔버스 world(5000×5000) div가 `overflow:hidden`이고, 팬은 world 경계까지만 됨(react-zoom-pan-pinch limitToBounds 기본값).
- 포스트잇 좌표는 world 기준인데 경계 제한이 없었음: 클릭 위치는 40px 여백만 두고(회전 · 실제 크기 미반영), 빈자리 탐색(`findFreePosition`)은 최대 10링(~1900px)까지 밖으로 밀어낼 수 있었고, seed도 군집 기준 거리만 봄.
  → world 밖으로 나간 부분은 world clip에 잘리고, 팬해도 경계에서 멈춰 나머지를 볼 수 없었음(로컬 재현: 좌 62 · 우 51~121 · 위 43px 잘림).
- 바깥 글까지 fit-to-content에 들어가 처음 화면도 넓게 퍼져 보였음.

## 수정

- `src/lib/guestbookNoteBounds.ts`(신규, 순수 함수): `rotatedOverhang`(회전 외곽), `noteSafeBounds`(여백 40 + 회전 외곽, 최소 8° 가정), `clampNoteToWorld`, `centerBiased`, `centralBounds`. WORLD_W/H 단일 출처(canvasConstants가 re-export).
- `findFreePosition`에 선택 옵션 `bounds` — 원하는 위치를 범위 안으로 당기고 범위 밖 후보는 고르지 않음(옵션 없으면 기존과 동일).
- 캔버스: 렌더 · 진입 fit-to-content · 포스트잇으로 이동은 보정된 위치(`clampNoteToWorld`), 새 글 위치는 `noteSafeBounds` 안에서만 탐색. 클라이언트 충돌 검사는 저장 좌표와 보정 좌표 둘 다 피함(서버 검증은 저장 좌표 기준 그대로).
- seed: 군집으로부터 거리 `220 + centerBiased × 480`(가까울수록 촘촘), world 가운데 70% ∩ 안전 범위 안에서만 배치. 이미 있는 샘플은 이동하지 않음.
- 저장 좌표 · DB · 스키마 변경 없음. 디자인 · 팬/줌 · 내 글 강조 · 작성 흐름은 그대로.

## Verification

- TypeScript 통과 / vitest 62 files · 610 tests(신규 11: 경계 근처 4방향 · 모서리 · 회전 · 안쪽 좌표 유지 · bounds 탐색 · 중앙 편향 분포) / 변경 파일 eslint 통과 / `next build` 성공
- 로컬 dev + 임시 Postgres(경계 밖 · 걸친 좌표 포함 26개)로 Playwright 확인, 375 · 390 · 768 · 1280:
  world 경계 잘림 0건, body 가로 넘침 없음, 확대 후 좌/우 끝까지 팬하면 끝 포스트잇이 화면에 온전히 보임, 포스트잇 클릭 시 상세 열림,
  world 모서리 클릭 시 작성창이 안전 범위 시작점(52, 51)에 열림. 터치 핀치 · 실제 기기는 미확인.

## Problems found / Decisions needed

- 운영에 이미 놓인 샘플의 배치는 다음 seed에서 바뀌지 않음(부족분만 새 배치 규칙 적용). 기존 샘플까지 다시 모으려면 별도 결정 필요.
- 이 브랜치를 master에 merge할지.
