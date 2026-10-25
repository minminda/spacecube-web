# Handoff — HOME `?demoShot=` 촬영 전용 핀 (2026-10-25)

## 한 일
- `/?demoShot=<slug>` 요청에서만 HOME 「엄선한 공간」 선반 맨 앞에 해당 공간 카드를 올린다(`src/lib/home/homeData.ts`, `src/app/page.tsx`, `src/app/EditorialHome.tsx`).
- 파라미터가 없으면 기존 동작과 동일. 추천 가중치 · DB · 지역 · KPI 변경 없음. slug는 `^[a-z0-9-]{1,60}$`만 허용.
- 이미 저장 · 방문해 추천 후보에서 빠진 공간은 올리지 않는다(실제 정책 유지).
- 아카커피룸(`aka-coffee-room`)의 실제 지역은 용인 처인구 — 수정하지 않음. 망원 분류는 기존 시연 지역 모드(`ENABLE_PUBLIC_DEMO_SPACES`)가 담당.

## 되돌리기
- 촬영 후 `?demoShot=`을 쓰지 않으면 끝. 코드까지 제거하려면 이 커밋을 `git revert`.

## 검증
- tsc · eslint · vitest(src/lib 1100) · `npm run build` 통과.
