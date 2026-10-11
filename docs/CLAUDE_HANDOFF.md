# Claude Code Latest Handoff

Updated: 2026-10-11 (Admin 운영 구조 + HOME 선반 관리)

## 이번 세션

1. **HOME 선반 3종 구분** — `src/lib/home/shelfConfig.ts`의 `BUILTIN_SHELVES` 레지스트리가 정본.
   - **SYSTEM**(규칙 자동): new · area · curation · theme · story · cube
   - **PERSONALIZED**(사용자 데이터): for-you · interest · similar · saved · revisit · similar-people
   - **EDITORIAL**(운영자 선반): DB `HomeShelf`(kind=EDITORIAL, key=`ed:<id>`) + `HomeShelfSpace`(공간 · 순서 · 선정 이유 note)
   - 운영자는 **노출 · 순서 · (일부) 제목**만 조절. SYSTEM/PERSONALIZED 내용은 지정하지 않는다. 설정 행이 없으면 코드 기본값(노출 · 기본 순서 · 기본 제목) → 설정 없이도 이전 HOME과 같다.
   - **제목 재정의 가능**(`titleEditable`): for-you · interest · similar · saved · new · curation · story · revisit · cube. **제품 고정**: area · theme(규칙이 제목을 만듦) · similar-people. 지역 화면(`?area=`)은 항상 규칙 제목이고 EDITORIAL 선반은 나오지 않는다.
2. **HOME 렌더** — `EditorialHome.tsx`가 `blocks[key]` 맵을 만들고 `d.plan`(노출 · 순서)대로 그린다. 기본 순서는 이전과 같되 **테마 선반이 STORY 앞뒤로 갈라지던 것을 `theme` 한 덩어리 → `story` 순**으로 단순화(기존엔 테마 절반 · STORY · 나머지 절반). `homeData.ts`가 `plan` · `editorialShelves`를 반환. 편집 선반은 **공개 Pool에 있는 공간만**(초안 · 보관 · 데모 자동 제외), 공개 공간 0이면 숨김. 설정 테이블 조회 실패 시 기본 구성으로 fallback(`shelfData.ts`).
3. **Admin**
   - `/admin/content/home`(사이드바 "HOME 선반"): 선반 목록 ↑↓ 순서 · 노출 · 제목 + "편집 선반 만들기" → `/admin/content/home/shelves/[id]`(제목 · 설명 · 노출 · 공간 선택 `SpacePicker`(순서 · 선정 이유) · 삭제). 새 편집 선반은 숨김 상태로 시작.
   - API `/api/admin/home-shelves`(POST 생성 · PUT 전체 노출/순서/제목), `/[id]`(PATCH · DELETE, EDITORIAL만). 전부 `requireAdminApi`(비관리자 401 확인).
   - **공간 콘텐츠 편집**(`/admin/content/spaces/[id]`): "사용자 화면에서 보기 ↗" 추가, Partner(`cubeAvailable`)면 같은 slug의 운영 공간 · 에피소드 · 큐브로 가는 링크(없으면 운영 공간 만들기). 공간 필드(이름 · 지역 · 유형 · 대표 이미지 · 한 줄 · 태그 · 지도 링크 · 공개 · Partner)와 **CURATION 관리(제목 · 설명 · 공간 · 순서 · 공간별 선정 이유 · 공개)는 이미 구현돼 있어 변경 없음**.
4. 새 필드 중복 저장 없음. "선정 이유"는 기존 `EditorialCurationSpace.note`가 큐레이션용, `HomeShelfSpace.note`가 편집 선반용(비우면 큐레이션 이유 → 한 줄 소개로 대체).

## DB / schema

**추가만**(파괴적 변경 없음): enum `HomeShelfKind`, 테이블 `home_shelves` · `home_shelf_spaces`, `EditorialSpace.homeShelfLinks` 역관계(컬럼 아님). `prisma migrate diff`로 CREATE만 확인 후 `prisma db push` 적용(이 저장소는 migrations 디렉터리 없이 build의 db push 사용 — 배포 시 같은 CREATE만 실행됨). 공간 삭제 시 선반 연결은 Cascade(공간 자체 삭제는 기존 규칙대로 보관 상태 + 참조 없음일 때만).

## 유지 / 숨김 / 삭제 후보

- 유지: 기존 Admin 전부(운영 공간 · 큐브 · 에피소드 · 방명록 · 리포트 · 태그 · 지역 · 시연 데이터 · 큐레이터 프로토타입 · 미디어).
- 숨김/삭제 후보(이번엔 손대지 않음): `EditorialHomeSettings` 모델(HOME이 더 이상 쓰지 않음 — 코드 참조는 스키마 relation뿐), `/admin/stories`·`/admin/handwriting-test` 등 사이드바에 없는 옛 라우트, `/admin/curators` 프로토타입.

## Verification

- tsc · vitest 전체(97 files / 949 tests) 통과. eslint는 변경 파일 오류 없음(`admin/stories/page.tsx`의 기존 오탐 3건만 남음). 빌드는 생략.
- 로컬 e2e(임시 행 삽입 후 정리, 잔여 0): 편집 선반이 지정 order 위치에 나오고 공간 순서 · 선정 이유 반영, `story` 숨김 반영, `new` 제목 재정의 반영, 설정 제거 후 원래 구성 복귀. 비로그인 PUT/POST/PATCH/DELETE 401, `/admin/content/home`은 /login redirect.
- **미검증**: 관리자 로그인이 필요한 UI 조작(클릭으로 ↑↓ · 저장 · 선반 생성) — 에이전트는 관리자 로그인 불가. 첫 사용 시 `/admin/content/home`에서 한 번 확인 요망.

## 다음 세션 후보

- 함께한 공간 "운영자의 이야기"(story 블록)와 Episode 영역 역할 중복 판단.
- 편집 선반을 지역 화면에도 노출할지(현재는 전체 HOME만).
- `EditorialHomeSettings` 제거 여부.
- 사용자 결정: 다크 모드를 현장 화면까지 넓힐지 / 설정을 로그인 전용으로 할지.
