# Handoff — 모바일 주소창: Episode → Guestbook 진입 방식 재조정 (2026-11-01)

## 이번 수정 (7704b0f 후속)
- 실기기 관찰: Episode(주소창 접힘) → "방명록 열기"에서 주소창이 다시 펼쳐짐. 새 문서 로드(`<a>`)는 Safari가 항상 툴바를 펼친 상태로 시작하므로 `HardLink` 진입이 직접 원인일 가능성이 가장 높다(추정 — 에뮬레이션으로 검증 불가).
- 변경: Episode · 공간 페이지의 "방명록 열기"를 다시 `next/link`(클라이언트 내비게이션)로 되돌리고 `scroll={false}`(Next가 진입 시 `scrollTo(0,0)`을 호출하지 않게)를 추가. `HardLink.tsx` 삭제.
- 유지: QR 브리지의 `location.replace`(Episode가 새 문서로 시작 — 사용자가 Episode/Scene에서 주소창 접힘을 확인함), 방명록에서 나가는 링크의 `location.assign`(새 문서 HOME = 직접 접속과 같은 조건).
- 요인 분석(코드 사실 vs 추정): 사실 — 진입 CTA는 새 문서 로드였고, 방명록은 `html:has(.gb-shell)`로 html/body를 `overflow:hidden; height:100dvh`로 잠근다(CSS 선언, 첫 렌더부터 적용). 추정 — (1) 새 문서 로드가 툴바를 펼친다(Safari 일반 동작), (2) 클라이언트 이동이어도 문서가 스크롤 불가로 바뀌면 Safari가 툴바를 다시 펼칠 수 있다 → 이건 클라이언트 이동으로도 남을 수 있고 코드로 막을 수 없다(스크롤 가능한 문서를 만들려면 가짜 스크롤이 필요해 쓰지 않음).
- 미검증: 클라이언트 이동 후 실기기 주소창 상태, 방명록 → HOME 복귀 시 스크롤/주소창.
- 실기기 비교 방법: QR → Episode 스크롤(접힘) → 방명록 열기 → 하단 툴바 상태를 7704b0f(이전)와 비교.

---
# (이전) 모바일 주소창: QR → Episode → Guestbook → HOME 흐름

## 결론부터 (정직하게)
iPhone Safari의 주소창 접힘은 데스크톱 에뮬레이션으로 재현·확정할 수 없다. 아래 원인은 **코드 구조 분석에 근거한 가설**이고, 수정은 "HOME 직접 접속과 같은 조건(새 문서 + 스크롤 가능한 문서)에서 시작하게" 만드는 쪽이다. 실기기 확인 전에는 해결로 단정하지 않는다.

## 조사 결과 — HOME 직접 접속 vs QR 경로의 구조 차이
- 공통: 문서(body)가 스크롤 컨테이너. `body{overflow-x:hidden}`(html은 visible이라 viewport로 전파), `body min-height:100svh`, 상단 Navbar sticky + 하단 탭 fixed. Episode · Scene(같은 Episode 페이지 안) · complete는 모두 **문서 스크롤**, 내부 스크롤 컨테이너 없음, touch-action/preventDefault/wheel 리스너 없음(방명록 캔버스 제외). 에뮬레이션 실측: HOME scrollHeight 4079 > 812(스크롤 가능), 상세(/spaces/…) 869 > 812, body 인라인 overflow 없음.
- **QR 경로의 차이 ①**: `/c/[code]`는 고정(fixed) 흰 로딩 화면만 있는 문서(스크롤 불가)로 시작해, `router.replace`(소프트 내비게이션)로 Episode를 같은 문서에 이어 붙였다. 즉 Episode는 "스크롤 불가능하게 시작한 문서" 안에서 렌더됐다.
- **차이 ②**: Episode → 방명록도 소프트 내비게이션. 방명록은 `html:has(.gb-shell){overflow:hidden;height:100dvh}`로 문서 스크롤을 잠근다. 같은 문서에서 잠금이 켜졌다가(진입) 꺼지는(HOME 복귀, Navbar/BottomTabBar 링크) 구조였다.
- 잔여 부작용 점검: 방명록 unmount 시 `:has` 잠금은 선언형이라 자동 해제, Navbar의 body overflow 잠금은 cleanup에서 복원, visualViewport/resize/click 리스너 모두 cleanup 있음 → **JS/CSS 잔여 잠금은 발견되지 않음**. 남는 건 브라우저(iOS Safari)가 "잠금이 있던 문서"에서 주소창 접기 상태를 다시 계산하지 않을 가능성(가설, 미검증).
- `history.pushState/replaceState`: SpaceUnlockScreen이 인트로 후 `?src=qr` 제거에 `replaceState` 1회(스크롤과 무관). scrollRestoration 스크립트(reloadScroll)는 새로고침만 영향. 모바일 공간 카드는 `SpaceDetailModal`이 `location.reload()`로 독립 문서를 연다(이미 하드 로드).

## 수정(최소)
1. `CubeUnlockBridge.tsx`: 최종 이동을 `router.replace` → `window.location.replace`(새 문서, history는 replace). Episode가 HOME 직접 접속처럼 새 문서로 시작. /c 로딩 · Episode 인트로가 모두 흰 바탕이라 깜빡임 없음(실기기 확인 필요). SpaceScan 기록/쿠키 로직(`/api/cube-entry`)은 그대로.
2. `components/HardLink.tsx`(신규, 일반 `<a>`): Episode · 공간 페이지의 "방명록 열기" CTA에 사용 → 방명록이 `html` 잠금을 **첫 페인트부터** 갖는 새 문서로 열린다.
3. `GuestbookCanvas.tsx`: (a) 방명록 안의 모든 same-origin 링크(상단 링크 · Navbar · BottomTabBar)를 capture 클릭 핸들러로 `location.assign`(새 문서 이동)으로 전환, (b) `finishVisit`도 `location.assign`. 잠긴 문서를 그대로 두고 떠나므로 HOME · complete는 새 문서에서 시작. 새 탭/수정키/외부 링크/같은 URL은 건드리지 않음. pan/zoom · 작성 · 키보드 · 충돌 · 포스트잇 배치 코드는 무변경.
- 변경하지 않음: PWA 설정, QR/Cube 식별, 로그인, /demo-shot, 콘텐츠, DB.

## 해결 불가(브라우저 정책)
- 방명록은 pan/zoom 캔버스라 문서 스크롤이 없어 Safari/Chrome이 주소창을 접지 않는다(가짜 스크롤 미사용). `100dvh`로 보이는 높이만 채운다.
- 웹사이트가 주소창을 숨기거나, 위로 스크롤할 때 다시 나타나는 걸 막을 수는 없다. 카메라로 QR을 열면 Safari는 펼친 상태로 시작하고 사용자가 스크롤해야 접힌다.
- 하드 이동의 대가: 방명록 진입/이탈 시 클라이언트 라우팅보다 약간 느릴 수 있음(전체 문서 로드).

## 테스트
tsc · eslint(변경 파일) · vitest 1113 · `npm run build` 통과. 로컬 모바일 에뮬레이션(375×812, Chromium — 실기기 아님)으로 HOME/공간 페이지의 스크롤 가능성(scrollHeight>innerHeight), html/body overflow 값 확인. `/c`·Episode·방명록 경로는 스캔 · 열람 기록이 운영 DB에 쌓여 로컬에서 따라가지 않았다(미검증). 수정 전후 동일 조건의 A/B 측정은 하지 못했다.

## 실기기 필요(미검증) — 확인 순서
1. iPhone Safari 카메라 QR → /c → Episode: 로딩 → 인트로 깜빡임 없는지, Episode를 내리면 주소창이 접히는지.
2. Episode → 방명록 열기 → 방명록(주소창 펼침은 정상) → "이번 경험 마치기"/상단 링크/하단 탭으로 HOME → HOME을 내리면 주소창이 접히는지(직접 접속과 비교).
3. 문제가 남으면 그 단계(Episode / 방명록 이탈 / HOME)를 알려주면 가설을 좁힌다.
