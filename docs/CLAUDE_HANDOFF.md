# Handoff — 신규 공간 8곳 등록 · HOME 31곳 (2026-11-01)
- **적용(Production DB, EditorialSpace 새 행 8개만 추가, 기존 행 수정 0)**: `scripts/seed-photo-spaces.ts`(dry-run 기본, `--apply`, `--archive`로 되돌리기; 같은 slug면 건너뜀 → 재실행 시 등록 0·건너뜀 8 확인). 계획 데이터는 `src/lib/home/photoSpaceSeeds.ts`.
  - 사진 1 고요한 진열장 · 2 영상 아카이브 룸 · 3 작은 조명 가게 · 4 창가 서재 · 6 드립 도구 상점 · 7 작은 청음실 · 8 브라운관이 있는 창가 → 모두 `demo-photo-*`(시연용 가상 공간). **이름은 사진 분위기로 붙인 전시용 임의 이름**이며 주소 · 운영시간 · 링크 · 소개문은 비움(상세는 "위치 정보 준비 중" + 상단 "가상 공간이며 실제 장소가 아닙니다" 안내가 자동으로 붙음, 카드 라벨 없음). 지역은 기존 가상 공간과 같은 "망원동".
  - 사진 5(Music Complex Seoul 간판) → 이미 있던 운영 Space "뮤직컴플렉스"와 같은 사진이라 새 이름을 짓지 않고 그 Space 정보로 `demo-ext-music-complex`(실제 장소 · 인사동) 등록. 별도 업로드 없음.
  - 사진 7장은 Cloudinary `gonggancube/demo-photo/<slug>`에 업로드(원본 900px 폭 · 80~240KB, 재인코딩 없음), 렌더는 next/image.
- **추가 검토한 기존 공간**: 뮤직컴플렉스 → 추가. 별관 → 사진에 "© Kaden's Note" 워터마크라 제외 유지. 라이팅룸 → 사진이 방문자 얼굴 · 손편지 콜라주(공개 권한 불분명)라 제외. 다시점(dasijum) → 이미 등록된 dasijeom과 중복이라 제외. 카페 공간(buk) → 손님이 찍힌 사진이고 영구 시연 공간(방명록 운영)이라 제외. 컷더케이크 · 테일탱고 · 덴마크서재는 계속 HOME에서 숨김(DB · 사진 그대로).
- **측정(로컬 dev, 운영 DB 읽기, 에뮬레이션)**: HOME 고유 공간 23 → 31(`공간 31곳`), 선반 사진 57 → 73장(한 공간 최대 2회 노출 규칙 유지), 새 8곳 모두 노출, 숨김 3곳 노출 0, "시연" 라벨 0, 깨진 이미지 0, 모든 선반 이미지 lazy. 상세 확인: /spaces/demo-photo-small-lamp-shop에 가상 공간 안내 표시.
- 테스트: tsc · eslint(새 파일) · vitest · build 통과.
- 주의: 사진 8장은 모두 원본이 세로 900px폭이라 상세 16:9 대표 사진은 중앙 기준 크롭(공간별 `coverPosition` 지정). 실제 화면 구도는 눈으로 확인 필요. 다시 숨기려면 `--archive`(삭제 없음).

---
# Handoff — HOME 공간 전시: 라벨 제거 · 3곳 제외 · 사진 현황 (2026-11-01)
- **라벨 제거**: HOME 카드 · 검색/공용 SpaceCard · 상세의 "함께 소개된 공간" · 내 아카이브 카드/상세에서 "시연용 공간"/"시연 컬렉션" 표시를 뺐다(`demoBadge` 호출 제거, 함수는 남겨 둠). 데이터(isDemo · slug 접두어 · 기능 가용성)는 그대로. **남긴 문구(결정 필요)**: ① 가상 공간(demo-*) 상세 페이지 상단의 "시연용 공간 — 가상 공간이며 실제 장소가 아닙니다" 고지(SpaceDetail), ② 관리자 미리보기 배너, ③ 지역 잠금 안내의 "일부 공간은 시연용입니다", ④ 큐레이션 카드 eyebrow "· 시연용". 가상 공간을 실제처럼 보이게 하는 부분이라 임의로 지우지 않았다.
- **HOME 제외 3곳**: `src/lib/home/homeData.ts`의 `HOME_HIDDEN_SPACE_SLUGS`(demo-ext-cut-the-cake · demo-ext-tail-tango · demo-ext-denmark-library)를 finder pool에서 걸러 선반 · 추천 · 둘러보기 · 개수에서 모두 제외. DB/사진/상세(/spaces/…)/검색/관리자는 무변경. 다시 보이게 하려면 slug를 지운다.
- **소개 기본 숨김 · 선반 간격**: 직전 커밋(ed9bbec)에서 완료(HOME에는 "공간 소개" 펼침 버튼이 원래 없음).
- **측정(로컬 dev, 운영 DB 읽기)**: HOME 고유 공간 26 → 23(`공간 23곳`), 선반 내 사진 57장(한 공간 최대 2회 노출 규칙 유지), 깨진 이미지 0, 제외 3곳 노출 0, "시연" 라벨 0.
- **사진 · 공간 현황(DB 읽기)**: 공개 EditorialSpace 49행 중 대표 사진 있는 곳 26(실제 6 + 가상 demo-* 11 + 확장 demo-ext-* 9), proto-* 23행은 사진 없어 숨김. EditorialSpace.images는 전부 0장, 운영 Space도 imageUrl 1장씩 → **한 공간에 여러 장을 쓸 데이터가 없다**. HOME에 더 많은 사진을 보이려면 새 공간 등록이 필요. 아직 HOME에 없는 사진 보유 운영 Space: 뮤직컴플렉스(종로 인사동, 지역 불일치로 제외했던 곳), 라이팅룸(소개문이 인사말뿐), 별관(제3자 워터마크), 다시점(중복 행), 카페 공간(buk). 이번에 DB는 수정하지 않았다.
- **새 사진 8장 미등록(공간명 확인 필요)**: 이미지에서 이름이 읽히는 건 5번째("Music Complex Seoul" 간판 → 기존 운영 Space "뮤직컴플렉스"와 같은 곳으로 보이나 확인 필요)뿐. 1 전시 유리장 작품 "자연의 몽상"(전시 공간명 불명) · 2 TV 영상 전시 · 3 조명 가게 · 4 책장 · 6 커피 용품 선반 · 7 청음실(벽에 "Gong Myoung") · 8 CRT TV → 공간명 미확인. 이름을 받으면: 기존 행이면 이미지 추가, 새 공간이면 Cloudinary 업로드 + EditorialSpace(demo-ext-* 패턴, Partner/QR/Episode/방명록 없음) 등록.
- 테스트: tsc · eslint(변경 파일) · vitest · build 통과.

---
# Handoff — HOME 선반: 소개 기본 숨김 · 간격 축소 (2026-11-01)
- **현황 확인**: HOME에 "공간 소개" 버튼/펼침 인터랙션은 원래 없다. 카드에 기본 노출되던 설명은 `HomeSpaceCard`의 `reason`(추천/선정 이유 한 줄)이었다. 카드를 누르면 공간 상세(/spaces/[slug])로 가서 소개를 본다. 새 기능은 만들지 않았다.
- **변경**: (1) `EditorialHome.tsx`의 `SpaceShelf`가 `reason`을 카드에 넘기지 않는다 → HOME 선반 카드는 사진 · 공간명 · 지역/유형만(검색 결과 카드는 그대로 이유 표시, 데이터/추천 로직 무변경). (2) 선반 세로 패딩 `py-4 md:py-6` → `py-3 md:py-[18px]`(선반 사이 32/48px → 24/36px, 25% 축소; `Shelf.tsx` + `EmptySection`). 선반 디자인/이미지 비율/정렬/그림자 무변경.
- **확인(에뮬레이션)**: 선반 패딩 12px 적용, 지금 둘러보기 좋은 공간 선반의 카드 텍스트는 "공간명 / 지역 · 유형"만. tsc · eslint · vitest 1113 · build 통과.
- **요청과 다른 점**: "소개를 누르면 펼침/닫으면 복귀"는 기존 인터랙션이 없어 구현하지 않았다(새 기능 금지 조건). 필요하면 카드에 펼침을 추가하는 것을 후속으로 결정해 주세요. 선반 제목 아래 설명(description)은 공간 소개가 아니라 선반 설명이라 유지.
- 미검증: 실기기/데스크톱 큰 화면의 시각 확인.

---
# Handoff — 방명록 하단 미확장: 실기기 진단 도구 (2026-11-01)

## 상태: 원인 미확인 (임의 수정 없음)
- 이전 분석(캔버스 컨테이너 정상)은 **Chromium 에뮬레이션 결과**이며 실제 iPhone Safari와 일치하지 않는다고 보고됐다 → 확정 사실로 쓰지 않는다. 이번에는 레이아웃 값을 바꾸지 않았다(초기 배율 0.3 · 내비게이션 · 작성/키보드 · 데이터 모두 그대로).
- 코드로 확인되는 구조(에뮬레이션 390×844): 문서 스크롤 없음, Navbar 57 → `.gb-shell` 787(= `100dvh` − 57 − 1 근처, 한 곳에서만 차감) = 상단 줄 40 + 캔버스 674(80%) + 하단 CTA 73. 하단 탭(`BottomTabBar`)은 `/space/`에서 숨김, safe-area는 하단 CTA 한 곳. 중복 차감은 코드상 발견되지 않음.
- 세 원인 구분: A(캔버스 높이 부족) · B(내부 UI 과다: 상단 57+40, 하단 73 = 170px) · C(Safari UI 영역). 실제로 비는 곳이 A/B/C 중 어느 쪽인지는 **실기기에서만** 가를 수 있어 진단 오버레이를 추가했다.

## 진단 오버레이 (`?gbdiag=1`일 때만 렌더, 일반 방문자에게 안 보임)
- 파일: `src/app/space/[slug]/guestbook/GuestbookDiag.tsx`(+ GuestbookCanvas에서 쿼리 확인 후 렌더 1줄). 진단이 끝나면 두 곳 모두 삭제.
- 표시: innerHeight · visualViewport(height/offsetTop) · screen.height · **100lvh / 100svh / 100dvh 실측** · **safe-area top/bottom 실측** · documentElement client/scrollHeight · scrollY · nav / `.gb-shell` / 헤더 / 캔버스 / 하단 CTA의 top · bottom · height · dpr. 화면에는 초록선(innerHeight 하단), 노랑선(visualViewport 하단), 빨강(shell) · 파랑(캔버스) · 분홍(CTA) 테두리. 0.5초마다 + resize/visualViewport 이벤트에서 갱신(주소창 접힘/펼침도 추적).
- 에뮬레이션 확인(390×844): shell 하단 845 = innerHeight 845, lvh/svh/dvh 모두 845, safe-area 0/0 (실기기 값은 다를 수 있음).

## iPhone에서 확인하는 방법
1. 배포 후 Safari에서 `…/space/<slug>/guestbook?gbdiag=1`(QR로 들어간 뒤 주소 끝에 `?gbdiag=1`을 붙이거나, Episode에서 방명록 진입 후 주소창 수정).
2. 패널의 숫자와 선 위치를 스크린샷으로 보내주세요. 해석:
   - 빨강(shell) 하단 ≈ 노랑/초록선인데 그 아래가 화면에 보이면 → 선 아래는 Safari UI(C) 또는 safe-area 영역.
   - shell 하단이 초록선보다 한참 위 → A(높이 계산: `100dvh`가 `100svh`/`lvh`와 다른지 패널에서 비교).
   - CTA(분홍) 아래에 간격 없이 선까지 닿으면 B/A 아님. 상단 줄 40 + CTA 73이 크다면 그 값만 줄이는 것을 다음 단계로.
   - safe-area bottom이 34 등으로 나오면 CTA 아래 패딩이 그만큼 추가된 것(의도된 홈 인디케이터 여백).
3. 주소창이 펼쳐진/접힌 두 상태에서 각각 캡처하면 dvh 변화까지 보인다.

---
# Handoff — 모바일 방명록 캔버스 크기 · 초기 배율 (2026-11-01)

## 측정(임시 하네스 페이지 /space/gbtest로 실제 GuestbookCanvas 렌더, Chromium 모바일 에뮬레이션 — 실제 iPhone 아님, 하네스는 커밋하지 않음)
- 컨테이너는 가시 화면을 정확히 채웠다. 390×844: body 844 · Navbar 57 · `.gb-shell` 787(=844−57, 문서 스크롤 0) · 상단 줄 40 · **캔버스 674(80%)** · 하단 CTA 73. 375×667: shell 610 / 캔버스 497(74.5%). 430×932: shell 875 / 캔버스 762(81.8%). 393×852도 같은 식(shell=H−57, 캔버스=H−170). 폭은 항상 뷰포트 전체(0~W), 위아래 빈 공간 · 중복 차감 없음(dvh는 shell 한 곳, 모바일 하단 탭은 /space/에서 숨김, safe-area는 하단 CTA 한 곳).
- **실제 원인은 컨테이너가 아니라 초기 배율**: 최종(줌아웃) 배율이 `MIN_INITIAL_SCALE 0.16`으로 clamp돼(콘텐츠가 3000px대로 퍼져 fit 배율은 ~0.11) 390px 폰에서 포스트잇이 폭 27×17px — 가시 영역 폭이 2400 world px.
- 수정: 좁은 화면(<768px)의 하한만 `MOBILE_MIN_INITIAL_SCALE 0.3`(→ 포스트잇 52px, 가시 폭 ~1300 world px, 같은 밀도에서 한 화면에 ~15개). 데스크톱 0.16 유지. 카메라 중심(fit-to-content 중심) · 히어로 연출 · 데이터 · 포스트잇 좌표 변경 없음. 한 화면 글자는 여전히 작아 읽으려면 확대(히어로 연출 · 탭 작성은 0.85~).
- 작성/취소(430×932): 빈 곳 탭 → 선택 자리와 작성창 중심이 모두 (215,466)=가시 영역 정중앙(0.3→0.85 확대), 취소 시 이전 transform(0.3) 정확히 복귀.
- 회전 시: 카메라 배율은 다시 계산하지 않고 유지(초기 연출은 진입 1회). 작성 중 회전은 기존 visualViewport 재정렬이 처리.
- 미검증(실기기): iOS Safari의 dvh/주소창 확장·축소 시 실제 높이, 키보드, 회전, 홈 인디케이터 영역. 주소창 · 페이지 이동 관련 코드는 이번에 변경하지 않음.
- 변경 파일: `src/app/space/[slug]/guestbook/GuestbookCanvas.tsx`(상수 1개 + 조건 1줄). tsc · eslint · vitest 1113 · build 통과.

---
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
