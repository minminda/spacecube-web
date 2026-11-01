# Handoff — 모바일 뷰포트 · 방명록 키보드 · 기본 PWA (2026-11-01)

## 원인 (코드에서 확인)
- **방명록 문서 스크롤**: `body`가 `min-h-screen`(=100vh, 주소창을 접은 가장 큰 높이)인데 방명록 셸은 `100dvh`라, 주소창이 보이면 문서가 그 차이만큼 스크롤됐다. 캔버스는 `touch-action:none`이라 스크롤이 어색하게 겹쳤다.
- **작성창 입력 글자 13px**: iOS Safari는 16px 미만 입력창에 포커스하면 화면을 확대하고 되돌리지 않는다(작성창 · 수정창 모두).
- **iOS의 포커스 스크롤**: 입력창을 보이게 하려고 `overflow:hidden` 컨테이너(캔버스 · react-zoom-pan-pinch 래퍼)를 직접 스크롤해 캔버스가 비정상 위치로 밀릴 수 있었다.
- **키보드 보정 공식**: 기존 `-keyboardHeight/2`는 `innerHeight - vv.height`만 봐서 iOS의 `visualViewport.offsetTop`(상단 바가 올라가는 경우)을 못 맞췄고, 키보드가 아닌 높이 변화(회전)도 놓쳤다.
- 이미 괜찮았던 것: viewport-fit=cover, 하단 탭 safe-area + 문서 끝 spacer, 방명록 하단 바 safe-area, 방명록 셸 dvh, 모달 dvh. (`100vw` full-bleed는 모바일에 세로 스크롤바가 없어 무해.)

## 수정
- `globals.css`
  - 방명록 화면(`html:has(.gb-shell)`)만 문서 스크롤 잠금 + `100dvh`.
  - `.gb-composer-input`: 터치 기기(`pointer: coarse`)에서만 16px.
  - 최소 한 화면 높이 `.min-h-screen`, `.editorial-bleed > main`을 **svh**로(주소창이 보이는 안정적인 최소 높이). 높이를 고정하는 곳(방명록 셸 · 모달)은 기존대로 dvh. 100vh→dvh 일괄 치환 아님.
- `GuestbookCanvas.tsx` (위치 계산 · 충돌 · 줌 · 저장 API는 변경 없음)
  - 키보드/회전: `visualViewport`의 resize·scroll에서 "캔버스 ∩ 보이는 영역"의 가운데로 작성창을 다시 맞춤(키보드가 닫히면 원위치 복귀, 핀치 확대 중에는 건드리지 않음).
  - 캔버스 컨테이너의 `scroll` 발생 시 즉시 0으로 되돌림.
  - 입력창은 `autoFocus` 유지(iOS는 사용자 제스처 안의 focus만 키보드를 연다 — 지연 focus로 바꾸지 않음).
- PWA(최소): `src/app/manifest.ts`(standalone, 이름 공간큐브), `public/icons/*`(검정 바탕 흰 큐브 192/512/maskable/apple-touch), `layout.tsx`에 appleWebApp · themeColor · apple icon. **Service Worker · 오프라인 캐시 없음**, 설치는 선택. QR을 브라우저로 여는 흐름 그대로.

## 변경하지 않음
인증, `/demo-shot` 저장, 저장/포스트잇 API, QR/Cube, 접근 정책, 방명록 작성 횟수, DB schema.

## 검증
- tsc · eslint(변경 3파일) · vitest src/lib 1100 · `npm run build`(manifest.webmanifest 생성 확인) 통과.
- **브라우저 에뮬레이션(390×664, 터치 emulation, 실제 기기 아님)**: QR → EP → 방명록 흐름 열림 · 방명록 문서 높이 = 화면 높이(스크롤 0) · 하단 CTA 가시 · 작성창 열림 · 포커스 · 입력 16px · 높이를 380으로 줄여도(키보드가 올라온 상태 모사) 입력창과 "남기기"가 보임 · 공간 상세 끝까지 스크롤했을 때 푸터가 하단 탭에 가려지지 않음 · 가로 오버플로 없음 · 데스크톱 방명록 화면 이상 없음. manifest · theme-color · apple 메타 태그 노출 확인.

## 미검증 (실기기 필요 — 에뮬레이션으로 확인 불가)
- iPhone Safari / Android Chrome의 **실제 소프트 키보드**(visualViewport 동작), 주소창 접힘/펼침 중 레이아웃, 홈 인디케이터 겹침, 회전.
- iOS 입력창 확대(16px 수정이 실제로 막는지).
- 홈 화면에 추가 후 standalone 실행(주소창 없는 상태에서는 브라우저 뒤로가기가 없고, 소셜 로그인이 standalone에서 어떻게 열리는지 미확인 — 전시 시연은 로그인 불필요).

## 검증 중 생긴 데이터 (Production DB, 로컬 dev가 연결됨)
SpaceScan 1건(GC-001), 방명록 WRITE_ATTEMPT 계측 1건. 포스트잇은 저장하지 않음.
