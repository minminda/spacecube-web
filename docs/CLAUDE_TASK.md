# Claude Code Current Task

Updated: 2026-10-05

## Goal

`추천 > 공간`의 지역/카테고리 드롭다운 UX를 수정한다.

현재 문제:

- `카테고리` 또는 `지역` 드롭다운을 연 뒤 페이지의 빈 영역을 손가락으로 스크롤하면 드롭다운이 닫힌다.
- 사용자는 다시 버튼을 눌러야 하므로 불편하다.
- 카테고리/지역 종류가 많을 경우 드롭다운이 아래로 너무 길게 늘어진다.

목표:

1. 페이지를 스크롤해도 열린 지역/카테고리 드롭다운이 유지된다.
2. 사용자가 명시적으로 닫거나 항목을 선택하기 전까지 열린 상태를 유지한다.
3. 항목 수가 많으면 드롭다운 자체의 높이를 제한하고 내부 목록만 스크롤한다.
4. 지역과 카테고리에 동일한 UX를 적용한다.

---

## Before implementation

반드시 먼저 읽기:

- `CLAUDE.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_DECISIONS.md`
- 이 파일

그리고 현재 `추천 > 공간`의 지역/카테고리 드롭다운 구현을 먼저 조사한다.

특히 확인:

- 어떤 component가 open state를 관리하는지
- scroll event에서 close시키는 코드가 있는지
- Radix/Popover/DropdownMenu/직접 구현 중 무엇을 사용하는지
- outside interaction 처리 방식
- mobile touch/pointer 처리 방식
- URL query 상태와 filter 상태를 어디서 관리하는지

새 드롭다운 시스템을 만들기보다 현재 구현을 최소 수정한다.

---

## 1. 페이지 스크롤로 드롭다운 닫히지 않게

현재 카테고리 또는 지역 드롭다운을 열고 페이지 body를 위/아래로 스크롤하면 닫히는 동작을 제거한다.

원하는 동작:

1. `카테고리` 클릭
2. 목록 열림
3. 사용자가 페이지를 손가락으로 위/아래 스크롤
4. 목록은 계속 열린 상태 유지
5. 다시 `카테고리` 버튼을 누르거나 항목을 선택하면 닫힘

지역도 동일.

중요:

- 일반적인 viewport scroll 자체는 close trigger가 아니어야 한다.
- `scroll`, `touchmove`, mobile browser viewport movement 때문에 자동 close되면 안 된다.
- 단순히 `position: fixed`로 억지 해결하지 말고 현재 Popover positioning 구조에 맞게 처리한다.

---

## 2. 닫히는 조건

기본적으로 다음 경우에는 닫혀도 된다.

- 같은 드롭다운 버튼을 다시 누름
- 지역/카테고리 항목 선택
- 다른 드롭다운을 엶
- ESC 입력
- 명시적인 close action

바깥 영역 클릭으로 닫는 기존 UX는 현재 구현을 확인한 뒤 유지 가능하다.

단, 모바일에서 사용자가 페이지를 스크롤하기 위해 빈 영역을 touch/pointer down한 것만으로 즉시 닫혀서 스크롤 중 사라지는 문제는 해결해야 한다.

즉 `outside click`과 `scroll gesture`를 구분해서 처리한다.

---

## 3. 지역/카테고리 둘 다 동일 적용

두 드롭다운은 같은 UX 규칙을 사용한다.

### 지역

`[ 전체 ] [ 지역 ▼ ]`

예:

- 연남
- 망원
- 서촌
- 성수
- 기타 현재 실제 canonical area

### 카테고리

`[ 공간 검색 ] [ 카테고리 ▼ ]`

예:

- 카페
- 복합문화공간
- 독립서점
- 전시공간
- 현재 실제 DB/category definition 값

둘의 open/close/scroll behavior가 다르게 느껴지지 않게 한다.

가능하면 공통 Dropdown/List component 또는 공통 스타일을 재사용한다.

---

## 4. 드롭다운 최대 높이

지역/카테고리 항목이 많아도 목록이 화면 아래로 무한히 길어지지 않게 한다.

드롭다운에 viewport 기준 최대 높이를 둔다.

권장 방향:

```css
max-height: min(320px, 45vh);
overflow-y: auto;
overscroll-behavior: contain;
```

실제 프로젝트 스타일/Tailwind에 맞게 구현.

고정 320px을 반드시 쓰라는 뜻은 아니며, 모바일/데스크톱에서 자연스럽게 보이는 범위로 결정한다.

핵심:

> 일정 개수 이상부터는 페이지 전체가 아니라 드롭다운 내부에서 스크롤한다.

---

## 5. 내부 스크롤

카테고리가 많을 경우:

1. `카테고리` 클릭
2. Dropdown은 일정 높이까지만 열림
3. 그 안에서 손가락/휠로 스크롤
4. 아래 항목 확인
5. 항목 선택
6. Dropdown 닫힘
7. 선택된 카테고리 필터 적용

지역도 같은 동작.

---

## 6. 모바일 Touch UX

375 / 390px에서 실제 touch behavior를 특히 확인한다.

다음을 구분해서 동작해야 한다.

### A. 드롭다운 내부 swipe

→ 드롭다운 목록만 스크롤

### B. 드롭다운 바깥 페이지 swipe

→ 페이지 자체 스크롤
→ 드롭다운은 열린 상태 유지

### C. 항목 tap

→ 선택
→ 닫힘

### D. 버튼 다시 tap

→ 닫힘

현재 bug처럼 B에서 닫히면 안 된다.

---

## 7. Scroll chaining

Dropdown 내부가 끝까지 내려간 뒤 body가 갑자기 같이 움직이는 현상이 과하면 `overscroll-behavior` 등을 이용해 자연스럽게 제한한다.

하지만 body scroll 자체를 완전히 lock하지 않는다.

사용자는 Dropdown을 연 상태에서도 페이지를 스크롤할 수 있어야 한다.

---

## 8. Dropdown 위치

페이지 스크롤 중에도 Dropdown이 trigger와 이상하게 분리되거나 화면에 고정되어 떠 있으면 안 된다.

현재 positioning library가 scroll 시 anchor position을 재계산하는 기능이 있다면 사용.

원하는 느낌:

- trigger와 dropdown 관계 유지
- viewport 밖으로 잘리지 않음
- 필요하면 placement flip
- horizontal overflow 없음

---

## 9. 항목 수에 따른 동작

### 항목 적음

예: 3~5개

→ 내용 높이만큼 자연스럽게 표시

### 항목 많음

예: 8개 이상 또는 viewport height를 초과할 정도

→ 최대 높이까지만 표시
→ 내부 scroll

항목 개수를 하드코딩해서 `8개면 스크롤` 같은 방식보다는 CSS max-height 기반을 우선한다.

---

## 10. Scrollbar

Desktop에서는 기본 scrollbar 또는 현재 디자인과 크게 충돌하지 않는 얇은 scrollbar 사용 가능.

Mobile에서는 브라우저 native touch scroll 그대로 사용.

과한 custom scrollbar는 만들지 않는다.

---

## 11. 현재 필터 기능 유지

이번 작업으로 다음 기능을 변경하지 않는다.

- 지역 filter
- category filter
- 공간 검색
- URL query
- 개인화 ranking
- 저장 기능
- 모바일 4열 Space grid

오직 dropdown interaction/presentation을 수정한다.

---

## 12. 선택 상태

현재 지역 선택 예:

`[ 전체 ] [ 연남 ▼ ]`

현재 카테고리 선택 예:

`[ 공간 검색 ] [ 복합문화공간 ▼ ]`

기존 selected label/URL query 동작 그대로 유지.

Dropdown 내부의 현재 선택 표시도 유지.

---

## 13. 두 Dropdown 상호작용

지역 Dropdown이 열린 상태에서 카테고리 버튼 클릭:

- 지역 닫힘
- 카테고리 열림

카테고리 열린 상태에서 지역 버튼 클릭:

- 카테고리 닫힘
- 지역 열림

두 목록이 동시에 열려 겹치지 않게 한다.

---

## 14. Browser Back / query

드롭다운 open state 자체를 URL에 넣지 않는다.

선택된 filter만 기존 query에 유지.

Browser Back/Forward 동작은 현재와 동일해야 한다.

---

## 15. Desktop Test

1280px에서 확인:

- 지역 open
- page scroll
- open 유지
- 내부 scroll
- category open
- page scroll
- open 유지
- 내부 scroll
- outside click
- ESC
- 선택

---

## 16. Mobile Test

375 / 390에서 반드시 실제 브라우저/touch 시뮬레이션.

### Category

- open
- page swipe
- open 유지
- 내부 swipe
- 원하는 항목 선택

### Area

- open
- page swipe
- open 유지
- 내부 swipe
- 원하는 지역 선택

Horizontal overflow 없어야 한다.

---

## 17. Edge Cases

확인:

- 리스트가 viewport 아래쪽에서 열릴 때
- 모바일 주소창 높이가 변할 때
- 화면 회전/resize
- category 이름이 긴 경우
- region/category가 1개뿐인 경우
- 항목이 매우 많은 fixture 상황
- 검색 입력 focus 상태에서 dropdown open

---

## 18. Accessibility

기존 접근성 유지/개선.

- `aria-expanded`
- keyboard navigation
- ESC close
- 선택 상태
- focus handling

드롭다운이 page scroll 때문에 focus를 잃고 닫히지 않게 한다.

---

## 19. Regression

반드시 확인:

### 추천 > 공간

- 지역 선택 정상
- 카테고리 선택 정상
- 검색 정상
- combined filter 정상
- ranking 순서 유지

### 추천 > 사람

이번 변경 영향 없음.

사람 탭에 지역/카테고리 dropdown이 나타나면 안 됨.

---

## 20. Do not

하지 말 것:

- 추천 알고리즘 수정
- category schema 변경
- area schema 변경
- filter 디자인 전면 재설계
- modal/fullscreen selector로 교체
- body scroll lock
- 새 UI library 추가

현재 구현을 최소 변경한다.

---

## 21. Completion

통과:

- TypeScript
- tests
- build
- changed files lint

가능하면 dropdown interaction 관련 test도 보강.

작업 완료 후:

1. commit
2. push master
3. `docs/CLAUDE_HANDOFF.md` 갱신

---

## Final report

`CLAUDE_HANDOFF.md`에 다음을 기록한다.

1. 기존에 scroll 시 dropdown이 닫힌 원인
2. 수정한 open/close 로직
3. category max-height / internal scroll 방식
4. area max-height / internal scroll 방식
5. mobile page scroll과 dropdown internal scroll 테스트 결과
6. Desktop 결과
7. regression 결과
8. tests/build 결과
9. commit SHA

## Final UX principle

> 지역/카테고리 드롭다운은 사용자가 직접 닫거나 선택하기 전까지 열린 상태를 유지한다.

> 항목이 많아져도 화면 전체를 길게 덮지 않고, 드롭다운 안에서만 스크롤한다.

> 같은 규칙을 지역과 카테고리에 동일하게 적용한다.
