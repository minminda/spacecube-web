# Handoff — 전시용 포스트잇 재배치 · 탭 위치 중앙 이동 작성 UX (2026-11-01)

## 1. 전시용 포스트잇 120개 재배치 (Production DB, 좌표만)
- 대상: 샘플 작성자(isDemo)의 글 중 전시용 추가 전 snapshot에 없는 것 = 아카커피룸 · 녹화버튼 · 턴다운서비스 각 40개(총 120). `scripts/relayout-demo-postits.ts`(기본 dry-run, `--apply`로 반영; `--snapshot <전 snapshot.json>` 필수, `--out <폴더>`면 before/after SVG · 이전 좌표 백업 JSON 생성).
- 알고리즘: `scatterDemoNotes`(`src/lib/sampleGuestbookLayout.ts`) — best-candidate(노트마다 고정 난수 후보 40개 중 충돌 없고 기존 글 · 라벨에서 가장 먼 자리). 격자도 쏠림도 아닌 불규칙 분산, seed 고정이라 재현됨. 충돌은 기존 `postitCollision`(회전 포함 실제 풋프린트 + 36px 여백)으로 판정.
- 영역: `SAMPLE_AREA_RATIO` 0.5 → **0.68**(world 가운데 68%, 바깥 띠는 실제 방문자용). 이 값을 바꿔야 배포마다 도는 seed(`--apply`)가 새 좌표를 "안전하지 않음"으로 보고 되돌리지 않는다 — seed dry-run으로 "이동 0" 확인함.
- 결과(dry-run = apply 동일): 대상 120 · 신규 0 · 텍스트 변경 0 · 기존 글/샘플 좌표 변경 0(snapshot 대비) · 라벨 충돌 0 · 포스트잇 간 충돌 0 · 기존 글/샘플 충돌 0 · 배치 실패 0. 사분면(좌상/우상/좌하/우하) 아카 10/12/5/13, 녹화 12/10/6/12, 턴다운 13/10/7/10 (좌하가 적은 건 기존 글이 그쪽에 모여 있어서). 재실행해도 동일(idempotent).
- 시각화/백업: 스크래치패드 `…/8e890855-…/scratchpad/relayout/`(`*-before.svg` · `*-after.svg` · `demo-coords-before.json`). 적용 전 120개의 이전 좌표는 `demo-coords-before.json`에 있음 — 되돌리려면 id별로 x,y를 되돌린다(작성자 조건 포함).
- 참고: 아카커피룸 전체 글 수가 handoff 직전 기록(60)보다 1 적은 59로 조회됨(대상 40 · 고정 19) — 이번 작업과 무관(삭제/수정 안 함), 확인만 필요.

## 2. 방명록 작성 UX (`GuestbookCanvas.tsx`)
- 이전: 작성창이 카메라와 무관한 중앙 오버레이(선택 위치와 연결 안 됨).
- 지금: 빈 곳을 탭 → 월드 좌표(충돌 방지 보정 후 최종 좌표) 확정 → 카메라가 그 점을 "보이는 영역(visualViewport) 한가운데"로 450ms 이동(`centerOnVisible`, 현재 줌 유지 · 0.85 미만이면 0.85까지만 확대) → 같은 자리에 작성창이 뜬다 → 저장은 같은 좌표. 취소하면 이전 카메라(pan/zoom)로 복귀. 오버레이는 옅게(0.3) 해서 선택 자리가 비쳐 보임.
- 키보드/회전: visualViewport resize·scroll, window resize 때 같은 점을 새 한가운데로 180ms 재정렬(배율 불변). 입력 16px(터치) → iOS 확대 없음. 본문만 내부 스크롤, 취소/남기기 하단 고정(기존).
- 충돌: 탭한 자리가 점유돼 있으면 기존 `findFreePosition`으로 가장 가까운 빈자리로 옮기고 토스트 "가까운 빈자리에 흔적을 놓았습니다" — 카메라와 작성창은 **최종 위치** 기준. 서버는 좌표를 그대로 저장하고 점유 시 거절(POSTIT_POSITION_OCCUPIED → 안내 후 취소)하므로 클라이언트 · 서버 위치가 어긋나지 않는다.
- 한계: world 가장자리 근처는 팬 경계(limitToBounds) 때문에 정중앙까지 못 옮길 수 있다.

## 3. PWA / 주소창 (코드 변경 없음)
- 이미 정상: `manifest.ts`(`display: standalone`, scope `/`, theme/background `#000000`, 아이콘 3종), `layout.tsx`(`appleWebApp.capable`, statusBar `black`, viewport `themeColor #000000` · `viewportFit: cover`). 방문자 대상 링크의 `target=_blank`는 외부(지도 · Instagram)뿐이고 내부는 관리자 화면에만 있어 standalone에서 Safari로 튕기는 경로 없음. QR 진입 `window.location.href`는 같은 origin.
- 한계(변경 없음): 일반 Safari/Chrome에서는 JS/CSS로 주소창을 숨기거나 다시 나타나는 걸 막을 수 없다. 방명록은 캔버스가 문서 스크롤을 쓰지 않아 주소창이 접히지 않지만 `100dvh`라 주소창 변화에 맞춰 높이가 자동 조정. 앱처럼 쓰려면 "홈 화면에 추가"(standalone). 가짜 스크롤/scrollTo 우회 없음.

## 테스트
tsc · eslint(변경 파일) · vitest 119파일 1113 · `npm run build` 통과(`scatterDemoNotes` 테스트 3개 추가). 방명록은 QR 잠금 + 운영 DB라 로컬 브라우저에서 열면 스캔 KPI가 오염돼 **UI는 브라우저로 직접 검증하지 못했다**(코드 · 타입 · 빌드 검증만).

## 실기기 필요(미검증)
iPhone Safari / Android Chrome에서: 빈 곳 탭 → 그 자리가 화면 중앙으로 이동 → 작성창 → 키보드 → 저장 위치 일치, 줌인/줌아웃/회전/새로고침 직후 동일 동작, 저장 후 새 글이 있던 자리에 보이는지, 취소 시 원위치 복귀, 점유 자리 탭 시 토스트 + 이동한 최종 위치, 홈 화면 추가 후 전체 이동, 전시용 120개 분포 첫 화면 밀도.
