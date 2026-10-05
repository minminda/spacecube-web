# Claude Code Current Task

Updated: 2026-10-05
Automation trigger: 2026-10-05 test run

## Goal

`추천 > 공간`의 지역/카테고리 드롭다운 UX를 수정한다.

현재 문제:
- 카테고리 또는 지역 드롭다운을 연 뒤 페이지 빈 영역을 손가락으로 스크롤하면 드롭다운이 닫힌다.
- 항목이 많을 때 목록이 아래로 너무 길게 늘어진다.

## Required behavior

1. 지역/카테고리 드롭다운은 페이지 body를 스크롤해도 열린 상태를 유지한다.
2. 일반 `scroll`, `touchmove`, mobile viewport movement는 close trigger가 아니어야 한다.
3. 다음 경우에는 닫혀도 된다.
   - 같은 버튼 다시 클릭
   - 항목 선택
   - 다른 드롭다운 열기
   - ESC
   - 명시적 close
4. 모바일에서 바깥 영역을 swipe해 페이지를 스크롤하는 동작과 단순 outside click을 구분한다. 페이지 스크롤 gesture 때문에 즉시 닫히면 안 된다.
5. 지역/카테고리 두 드롭다운에 동일한 동작을 적용한다.
6. 항목이 많을 때 드롭다운 자체에 최대 높이를 두고 내부 목록만 스크롤한다. CSS max-height 기반을 우선한다.
   권장 방향:
   - `max-height: min(320px, 45vh)` 또는 현재 UI에 맞는 유사 값
   - `overflow-y: auto`
   - 필요 시 `overscroll-behavior: contain`
7. 항목이 적으면 내용 높이만큼 자연스럽게 보여야 한다.
8. body scroll lock은 하지 않는다. 드롭다운이 열린 상태에서도 페이지 스크롤은 가능해야 한다.
9. 지역이 열린 상태에서 카테고리를 누르면 지역은 닫히고 카테고리만 열린다. 반대도 동일.
10. 페이지 스크롤 중 dropdown이 trigger와 시각적으로 분리되어 고정된 채 떠 있지 않도록 현재 positioning 구조를 유지/보정한다.

## Preserve

다음은 변경하지 않는다.
- 지역 filter 결과
- category filter 결과
- 공간 검색
- URL query
- 기존 개인화 ranking
- save 기능
- 모바일 4열 Space grid
- 사람 탭
- category/area schema
- 추천 알고리즘

새 UI library 추가나 필터 전면 재설계 금지. 현재 구현을 조사한 뒤 최소 변경한다.

## Before coding

반드시 읽기:
- `CLAUDE.md`
- `docs/AI_WORKFLOW.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_DECISIONS.md`
- 이 파일

현재 dropdown open state, outside interaction, scroll/touch event 처리, positioning 방식을 먼저 조사하고 실제 원인을 확인한 뒤 수정한다.

## Verification

모바일 375 / 390:
- Category open → 페이지 swipe → open 유지
- Category 내부 swipe → 내부 목록 scroll
- 항목 tap → 선택 후 close
- Area도 동일
- horizontal overflow 없음

Desktop 1280:
- 지역/카테고리 open 후 page scroll 시 유지
- 내부 wheel scroll 정상
- 항목 선택 정상
- ESC 정상
- 다른 dropdown 열기 정상

Regression:
- 지역 + 카테고리 + 검색 조합 정상
- 기존 ranking 유지
- 사람 탭 영향 없음

완료 전 TypeScript, 관련 tests, build, changed-files lint를 확인한다.

작업 완료 후 `docs/CLAUDE_HANDOFF.md`를 갱신하고 commit/push한다.

Handoff에는 다음을 포함한다.
- scroll 시 닫힌 원인
- 수정한 open/close 로직
- max-height/internal scroll 방식
- mobile/desktop 검증 결과
- test/build 결과
- commit SHA

핵심 UX:
> 지역/카테고리 드롭다운은 사용자가 직접 닫거나 선택하기 전까지 페이지 스크롤만으로 사라지지 않는다.
> 항목이 많아져도 화면 전체를 길게 덮지 않고 드롭다운 내부에서 스크롤한다.
