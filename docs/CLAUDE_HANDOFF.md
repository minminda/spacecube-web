# Claude Code Latest Handoff

Updated: 2026-10-11 (Space 상세 저장 아이콘 · 방명록 수 제거 · HOME 중복 노출 제어)

## 이번 세션 (Space 상세 정리 + HOME 중복 노출 제어)

1. **방명록 흔적 수 제거** — `/spaces/[slug]`의 "지금까지 방명록에 남은 흔적 N개"와 집계 모듈 `partnerTrace.ts`(미사용이라 삭제) 제거. 방명록 기능 · DB · 현장 흐름 · 관리자 KPI 무변경.
2. **저장 아이콘** — 헤더 텍스트 영역의 버튼 제거, 대표 이미지(`EdImage`를 `relative` div로 감쌈) 우측 상단에 `SaveButton variant="detail"`(44px 터치, 반투명 흰 면 + blur, 저장됨=filled). 사진이 없어도 EdImage 플레이스홀더 면이 항상 렌더되므로 같은 자리. 저장 API · 로그인 복귀 정책 · fixture mock 그대로.
3. **HOME 중복 제어** — 순수 함수 `src/lib/home/diversity.ts`(`diversifyShelves`), `homeData.ts`의 `diversifyHome`이 마지막에 적용. 기존 ranking은 그대로 두고 "HOME에서 이미 나온 횟수"로만 후보를 재정렬(빼지 않음 → 후보가 모자라면 중복 허용). 선반은 plan상 보이는 순서대로 처리(엄선은 항상 먼저 셈). 선반 후보를 36개까지 만들어 두고 화면엔 12개.
   - strong(적게 나온 순 → 같은 횟수면 첫 카드로 덜 쓰인 공간 → 원래 순서): 새롭게 소개 · 테마 · EDITORIAL
   - light(2회 이상 나온 공간만 뒤로): 엄선 · 관심 지역 · 비슷한 사람 · 지역/유형 선반
   - none(손대지 않음): 찜 · 다시 떠올려볼 · 함께한 공간
4. fixture 30곳 실측(`?preview=fixtures` 데이터로 `getHomeData` 직접 호출): 카드 149칸/고유 59곳 → 평균 2.5회는 구조상 고정(칸 수 ÷ 공간 수). 최대 5→4회, 4회 공간 10→6, 엄선∩신규 겹침 2/12→0/12. **최대 2회는 이 구조에선 불가능** — 테마 선반 8개가 소규모(7~12곳)라 후보 전체가 이미 들어 있고, 공간 하나가 테마 3개에 걸리기 때문. 더 줄이려면 구조 변경(테마 선반 노출 상한, 지역 선반에서 새 소개 제외)이 필요 — 이번엔 안 함.

## DB / schema
변경 없음. 운영 DB 쓰기 없음.

## Verification
- tsc · eslint(변경 파일) · vitest 전체(102 files / 974 tests, diversity.test.ts 신규) 통과. `next build` 미실행(prisma db push 포함).
- **미검증**: 상세 저장 아이콘의 브라우저 렌더 · 클릭(스크린샷/하이드레이션 불가 환경) — 코드 경로(SaveButton 토글 · 로그인 복귀)는 기존 그대로. HOME 중복은 데이터 수준(getHomeData 실측)으로만 확인.

## 다음 세션 후보
- 최대 2회까지 더 줄일지 결정(위 4번의 구조 변경 후보), 실제 공간 태그 · 지역 등록(이전 핸드오프 항목).
- 숨김 pane이 아닌 상태에서 실제 Partner 공간 EP.1 다이얼로그 · 저장 한 번 눈으로 확인.
