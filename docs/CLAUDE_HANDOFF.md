# Handoff — 졸업전시 최종 모바일 UX · 방명록 작성창 · 전시용 방명록 (2026-11-01)

두 커밋으로 분리: ① UI(작성창 오버레이 · 검정 테마) ② 전시용 방명록 데이터(seed + 답변 모음). 이전 커밋 `652efc3`(뷰포트 · PWA)은 이미 Production 배포됨.

## 1. 모바일 주소창 — 원인과 한계(정직하게)
- Safari/Chrome은 **문서 자체가 스크롤될 때만** 주소창을 접는다. 방명록은 캔버스가 `touch-action:none` + 문서 스크롤 없음이라 주소창이 접히지 않는다 — 브라우저 정책이고, 인위적 스크롤 · 가짜 스크롤 영역으로 속이는 건 하지 않았다(요청 사항).
- 대신 방명록 셸은 `100dvh`(이전 커밋)라 주소창이 접히거나 펼쳐지면 캔버스가 실제 보이는 높이를 그대로 채운다. 하단 바는 safe-area 적용. HOME · 상세 · Episode는 일반 문서 스크롤이라 주소창이 정상적으로 접힌다(최소 높이는 svh).
- 주소창 없이 쓰려면 홈 화면에 추가(standalone) — 이미 manifest 설정됨. 일반 Safari/Chrome QR 흐름이 우선.

## 2. 포스트잇 작성창 (P0)
- 이전: 캔버스 transform 안에서 클릭 위치에 떠서 줌 · 위치에 따라 잘리고 키보드에 가려졌음.
- 지금(`GuestbookCanvas.tsx`): 작성창을 `createPortal(document.body)` **고정 오버레이**로 분리, 화면(보이는 영역) 정중앙. 카메라(pan/zoom)는 움직이지 않음. 눌렀던 캔버스 좌표(x, y)는 그대로 기억해 저장 시 그 자리에 포스트잇 생성(저장 API · 충돌 · 위치 계산 변경 없음). 캔버스에는 저장될 자리를 점선 표시.
- 키보드: 평소엔 CSS `inset:0`. `visualViewport`가 레이아웃과 달라질 때(키보드 · iOS offsetTop)만 그 크기/위치로 오버레이를 맞춰 "키보드 위 보이는 영역의 가운데"에 놓는다. 카드가 보이는 영역보다 크면 본문만 내부 스크롤, 취소/남기기는 하단 고정.
- 입력 글자 16px(터치 기기) → iOS 확대 방지. 배경(오버레이) 탭 = 취소.

## 3. 검정 브라우저 테마
- `layout.tsx` viewport `themeColor: "#000000"`(중복 등록 없이 한 곳), `appleWebApp.statusBarStyle: "black"`, `manifest.ts` theme/background `#000000`. 본문 배경은 그대로(검정으로 바꾸지 않음). iOS Safari 하단 툴바/주소창 색은 OS가 정하므로 보장 불가.

## 4. 전시용 방명록 데이터 (분리 커밋)
- 기존 샘플 구조 재사용(`scripts/seed-sample-guestbook.ts`): 작성자는 `User.isDemo` 더미 계정 1개(`sample-guestbook@spacecube.local`), 포스트잇 이름 "익명의 방문자", Record · 공감 · 댓글 · 퍼널 없음, KPI · 리포트 · 추천 · 운영자 화면에서 제외(`getKpiExcludedUserIds`/`REAL_GUESTBOOK_NOTE_WHERE`). 스키마 변경 없음, 가짜 사용자 대량 생성 없음.
- `TARGET_BY_SLUG`로 세 공간만 12 → 52(기존 12 + 40). 답변 모음(`sample-guestbook-answers.ts`)에 공간 질문별 문장 추가(아카 Q1·Q2 각 +14, 녹화버튼 Q1·Q2 각 +14, 턴다운 Q1 +40; 공간 이름·새 사실 없이 질문에 답하는 형태, 80자 이하, 중복 없음).
- **dry-run → 반영(Production, 2026-11-01)**: 아카커피룸 +40(20→60), 녹화버튼 +40(16→56), 턴다운서비스 +40(15→55). 다른 공간 +0. 재실행해도 늘지 않음(멱등, 공간별 advisory lock).
- 검증(사전 스냅샷 대비): 기존 51개 중 삭제 0 · 수정 0(실제 글 변경 0), 새 글은 전부 샘플 작성자, Record 없음, 샘플 문장 중복 0. 배치는 기존 `layoutSampleNotes`(실제 글 · 라벨 · 다른 샘플 회피, 월드 가운데 안쪽만 사용 → 바깥쪽에 실제 방문자 작성 공간 확보).
- **복구**: 사전 스냅샷 `…/scratchpad/guestbook-snapshot-before.json`(51개 id) 있음. 이번 추가분만 지우려면 샘플 작성자의 글 중 스냅샷에 없는 id를 삭제(작성자+id 조건). 전체 샘플 정리는 `--cleanup --yes`(기존 12개씩도 지움 — 주의). Neon PITR도 가능.
- 주의: 이 seed는 Production 배포(postbuild)마다 `--apply`로 자동 실행된다(멱등). 전시 후 `TARGET_BY_SLUG`를 비우면 더 늘지 않는다(이미 있는 샘플은 유지).

## 테스트
tsc · eslint(변경 파일) · vitest 전체 1110 · `npm run build` 통과. 로컬 모바일 에뮬레이션(390×664 / 390×330, 터치 emulation — 실기기 아님)에서 상단 · 줌아웃 상태 · 좁은 높이(키보드 모사)에서 작성창이 정중앙, 취소/남기기 가시, 카메라 불변, 점선 자리표시 확인.

## 실기기 필요(미검증)
iPhone Safari / Android Chrome 실제 소프트 키보드(visualViewport), iOS 입력 확대 방지, 주소창 접힘/펼침, 홈 인디케이터, 작성창 → 저장 → 캔버스 반영, 포스트잇 40개 추가 후 첫 화면 밀도, 전시용 120개 시각 확인.
