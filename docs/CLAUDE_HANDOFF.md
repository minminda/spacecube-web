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

## 추가: 기존 더미 저장 좌표 정상화(이어진 커밋)

- 추가 원인: 예전 seed는 군집 중심 기준 거리만 보고(반원 · 최대 680px), 빈자리 탐색이 world 밖까지 밀어낼 수 있었으며, 회전 외곽 · 사진 글 크기 · 실제 글 회전을 고려하지 않았고, 이미 저장된 더미는 다시 보지 않았다. 또 `60c38aa`의 렌더 보정은 master에 아직 merge되지 않아 운영 화면에 반영되지 않은 상태였다.
- `src/lib/sampleGuestbookLayout.ts`(신규, 순수 함수): 샘플 영역 = world 가운데 50% ∩ 회전 외곽 포함 안전 범위. 실제 글(사진 글은 세로 320, 회전 외곽 포함) · 보이는 라벨을 장애물로, 기존 샘플을 createdAt · id 순으로 보며 영역 안이고 겹치지 않으면 유지, 아니면 note id로 고정된 난수로 군집 근처(가까울수록 촘촘) 빈자리로 이동. 간격 36px, 이동 자리는 회전 8° 외곽으로 잡아 다음 실행에서도 안전 → 멱등.
- seed: 운영 공간마다(질문 불일치로 새 글을 안 만드는 공간도) 위 정리를 적용하고, 새 샘플도 같은 함수로 배치. 수정은 `id + 샘플 작성자` 조건의 좌표만.
- 검증: 단위 테스트 6개(안전한 것만 유지 · 경계/밖/중앙 밖/실제 글 겹침/샘플끼리 겹침/라벨 위 이동 · 영역 · 무겹침 · 멱등 · 결정적 · 새 12개 배치 · 실제 글 비대상), 임시 Postgres에서 더미 12개 중 9개 이동 → 재실행 이동 0, 실제 글 · 비공개/시연 공간 글 좌표 불변.
  화면(375 · 390 · 1280): world 잘림 0, body 가로 넘침 없음, 확대 · 상하좌우 팬 · 축소 후에도 잘림 0, 일반적인 경우 첫 화면에 더미 12/12 전부 보임(경계 밖 실제 글이 있으면 그 글까지 맞추느라 모바일은 8/12).

## Problems found / Decisions needed

- 운영에 이미 놓인 샘플의 배치는 다음 seed에서 바뀌지 않음(부족분만 새 배치 규칙 적용). 기존 샘플까지 다시 모으려면 별도 결정 필요.
- 이 브랜치를 master에 merge할지.
