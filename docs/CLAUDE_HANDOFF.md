# Claude Code Latest Handoff

Updated: 2026-10-11 (Space 상세 통합 · HOME 카드 축소)

## 이번 세션

1. **Space 상세 통합** — 공개 `/spaces/[slug]`가 일반 · 함께한(Partner/Cube) 공간의 단일 상세.
   - INFORMATION에 `지도에서 보기 ↗`(`EditorialSpace.mapUrl`, 헤더에 있던 링크를 이동).
   - Partner(`cubeAvailable`)는 Episode 영역을 같은 페이지에 표시: `src/lib/editorial/partnerEpisodes.ts`가 같은 slug의 운영 `Space`/`Episode`를 읽는다. QR 전에는 **EP.1 제목 + 벡터 잠금 아이콘 + "이 공간에서 QR을 스캔하면 이야기가 열립니다."**만 내려간다(본문 · 다른 Episode 없음). 열림 판정은 기존 `resolveSpaceAccess`(12시간) + `computeEpisodeState`.
   - 열린 뒤: Episode 행이 기존 `/space/[slug]/episodes/[id]`(Scene 경험 그대로)로 링크, `방명록 열기`(`/space/[slug]/record`) 노출.
   - 일반 공간에는 Cube 잠금 UI가 없다(`cubeAvailable`일 때만).
   - `/space/[slug]`는 `?src=qr`가 **아닌** 방문이고 공개 상세가 있으면 `/spaces/[slug]`로 redirect(archive 등 기존 링크 호환). 공개 상세가 없는 운영 공간 · QR 진입은 기존 화면 유지.
2. **QR → Unlock**: `/c/[code]` → `/api/cube-entry/[code]`(스캔 기록 · 쿠키 · SpaceUnlock) → 대표 Episode `?src=qr&logged=1`. **무변경.** QR은 별도 페이지가 아니라 같은 Space의 Episode Unlock 역할.
3. **HOME Space 카드 축소**: `.ed-shelf-space` 폭 휴대폰 40vw→31vw(116px@375, 세 번째 카드가 걸쳐 보임) / 640px 22vw / 768px 16vw / 1024px+ clamp(160,13vw,220). `HomeSpaceCard`는 구조 그대로, 이름 13px · 지역/이유 11px로만 조정. 선반 스크롤/화살표 동작 그대로.

## DB / schema

변경 없음.

## Verification

- tsc · 변경 파일 eslint · vitest 전체(96 files / 942 tests) 통과. 빌드는 생략.
- 로컬(curl): aka-coffee-room 비로그인 — EP.1 제목 + 잠금 문구 + 지도 링크 확인, QR(`GC-001`) 후 Episode 링크 · 방명록 열기 노출, Episode 페이지 200, `/space/aka-coffee-room`는 `/spaces/...`로 redirect, `?src=qr`는 유지, 일반 공간에는 QR/잠금 UI 없음. HOME 카드 폭 desktop 166px(7장) / mobile 116px 실측.

## 다음 세션 후보

- Admin 구조 재검토 · Discovery 운영 구조 분석(이전 handoff의 2 · 3번 그대로).
- 함께한 공간의 "운영자의 이야기"(story 블록)와 Episode 영역의 역할 중복 여부 판단.
- 사용자 결정: 다크 모드를 현장 화면까지 넓힐지 / 설정을 로그인 전용으로 할지.
