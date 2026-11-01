# Handoff — 졸업전시 Golden Path 안정화 (2026-11-01)

## 결론
조사 결과 HOME → 상세 → QR → EP.1 → Scene → 방명록 작성은 **비로그인으로 이미 정상**(Production curl 확인). 막히는 곳은 두 군데뿐이라 그것만 최소 수정했다. DB schema · 인증 · 정책 변경 없음.

## 수정
1. **비로그인 저장 → 로그인 이동** (P1): 시연 브라우저 한정으로 해결. 기존 `/demo-shot` 구조를 재사용.
   - `/demo-shot` 접속 시 비-httpOnly 쿠키 `demoSave=1`(12h)을 추가로 심고, 매번 `demoSaves`(저장 표시 목록)를 비운다. `?off=1`은 둘 다 해제.
   - `SaveButton`(editorial 공용)이 `!loggedIn && demoSave=1`일 때만 로그인 대신 쿠키 `demoSaves`에 spaceId를 넣고 즉시 "저장됨" 표시. 새로고침 후에도 유지. **DB · SavedSpace · 추천에 쓰지 않음.**
   - `demoSave` 쿠키가 없는 일반 방문자는 기존 동작(로그인 이동) 그대로 — 로컬에서 확인.
2. **`/space/[slug]?src=qr`의 「방명록 열기」** (P2): 비로그인이면 `/login`으로 가던 것을 방명록으로 직행(방명록은 QR 쿠키로 비로그인 열람·작성 가능). 로그인 사용자는 기존 `/record` 유지.

## 핵심 변경 파일
`src/app/demo-shot/route.ts`, `src/components/editorial/SaveButton.tsx`, `src/app/space/[slug]/page.tsx`, `docs/exhibition-checklist-2026-11.md`(신규)

## 확인한 실제 데이터 (read-only)
| 공간 | slug | Cube | EP.1 | 방명록 |
|---|---|---|---|---|
| 아카커피룸 | aka-coffee-room | GC-001 | 공개 · Scene 5 | ACTIVE |
| 턴다운서비스 | turndown-service | GC-004 | 공개 · Scene 5 | ACTIVE |
| 녹화버튼 | nokhwabutton | GC-006 | 공개 · Scene 5 | ACTIVE |

세 공간 모두 isDemo=false, 공개 상세 200, `/c/<코드>` → `/api/cube-entry` → EP.1(`?src=qr`) → 방명록 200(로그인 없음).

## 테스트
tsc · eslint(변경 3파일) · vitest src/lib 1100 · `npm run build` 통과. 로컬 dev에서 저장(즉시 표시 · 새로고침 유지 · `/demo-shot` 초기화 · 일반 방문자 로그인 이동) 확인.

## Production 검증 중 생긴 데이터
- SpaceScan 4건(GC-001 ×2, GC-004 ×1, GC-006 ×1), User-Agent가 curl이라 식별 가능.
- 방명록 포스트잇은 **쓰지 않음**(작성 API는 빈 본문 400 응답으로 비로그인 도달만 확인).
- 로컬 dev 서버가 Production DB에 연결되어 있음(.env). 저장 데모는 쿠키만 써서 DB 쓰기 없음.

## 사람이 확인해야 할 것 (실기기)
- 실제 인쇄 QR을 iPhone Safari / Android Chrome 기본 카메라로 스캔해 URL이 `/c/GC-00x`인지.
- 포스트잇 작성 → 모바일 키보드가 버튼을 가리지 않는지, 캔버스 위치가 정상인지(코드상 확인 불가, 실기기 필요).
- 한 폰에서 반복 시연 시 포스트잇은 방문자(12h) 1개 정책이라 두 번째는 작성 불가 → 체크리스트 fallback 참고.
- 이 변경이 배포된 뒤 `/demo-shot`이 Production에서 `demoSave` 쿠키를 심는지.

## 결정 필요
- 같은 폰으로 반복 시연할 때 포스트잇 1개 제한을 시연 한정으로 풀지 여부(현재는 정책 유지, 시크릿 창/다른 기기 사용 권장).
- `isFeatured` 대표 이야기가 세 공간 모두 미지정 → 표시 순서 첫 번째(EP.1)로 폴백 중. 의도와 같으면 변경 불필요.
