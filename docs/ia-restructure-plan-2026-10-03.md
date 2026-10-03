# 정보 구조 개편 계획 — STORY / CURATION / 함께한 공간 / 저장 / 추천 / 아카이브 (2026-10-03)

시연·더미 데이터 정책(`src/lib/demoData.ts`, 커밋 91f66d8)은 완료된 전제로 그대로 사용한다.

## 1. 조사 결과

| # | 항목 | 현재 상태 |
|---|---|---|
| 1 | Navbar · 라우트 | `Navbar.tsx` 두 모드. `ENABLE_EDITORIAL_HOME=false` → 일반 방문자는 레거시 내비(공간큐브)·LegacyHome, 관리자만 에디토리얼 내비(CURATION/PEOPLE/SPACE/ABOUT). 사용자 라우트: `/`, `/about`, `/curation(/[slug])`, `/people(/[slug])`, `/spaces(/[slug])`, `/archive/**`, `/taste/[userId]`, `/login`, Cube 운영 `/c/[code]`·`/space/[slug]/**`, 레거시 `/discover`·`/stories`·`/story/[slug]`·`/recommendation`(전부 플래그로 진입점 없음) |
| 2 | Homepage | `EditorialHome`: INTRO 한 줄 → LATEST 슬라이더(발행 콘텐츠 5) → STORIES 피드(ALL/CURATION/PEOPLE/SPACE) → EXPERIENCE → PARTICIPATE → FOOTER. 자동 스트림(`listContentStream`) |
| 3 | 공간 | 두 계층. 공개 발견용 `EditorialSpace`(`/spaces/[slug]`, Cube와 FK 없음, `cubeAvailable` boolean) / 현장 운영용 `Space`(QR·Episode·방명록·Record). 발행 공간 6곳은 모두 Cube 파트너이며 운영 `Space`와 slug가 같다 |
| 4 | 추천 | `src/lib/recommend.ts` — `buildWeightedTasteVector`(Record.tasteScore × SpaceTag.weight, 공간당 최신 방문 1개, Tag.id 키) → `rankSpacesByVector`/`getVectorReason`/`getMatchPercent`. 화면: `/archive/taste`(TOP3), `/archive/taste/all`, 방명록 보상(`guestbookReward.ts`), 레거시 `/discover`. 후보는 운영 `Space`뿐. 별도 API 없음(서버 컴포넌트) |
| 5 | Archive | `/archive` 스와이프 "공간 노트" + 하단 탭(공간 노트/내 취향/저장한 공간/전체 기록). "내 취향" 탭이 실제 추천 페이지 역할 |
| 6 | 저장 | 운영 `Space` 대상 `SavedSpace` + `/api/spaces/[id]/saved` + `SaveSpaceButton`(Cube 상세에서만). `EditorialSpace` 저장은 없음 |
| 7 | Tag/Region | `Tag`(레거시 8개 분위기 태그 + "공간 유형" 카테고리 7개), `SpaceTag`(가중치). 지역: `Space.district` 자유 문자열 + `District`(지도 프리셋, 현재 1행). `EditorialSpace.area`/`EditorialCuration.area`도 자유 문자열("연남" vs "연남동" 혼재), `EditorialSpace.tags` 자유 문자열 배열(현재 전부 비어 있음) |
| 8 | Cube 구분 | 공개 계층은 `EditorialSpace.cubeAvailable`(관리자 수동 관리), 운영 계층은 `Cube.status=ASSIGNED`. 함께한 공간은 **`EditorialSpace.cubeAvailable=true` + PUBLISHED**로 판정(공개 계층 안에서 완결, 운영 DB 조인 불필요) |
| 9 | Episode/Scene 재사용 | Episode/Scene은 현장 QR 전용(공간당 해금·12시간 잠금·방명록 연결·KPI 계측)이라 웹 STORY로 쓰면 "웹에서 현장 이야기를 미리 여는" 문제가 생긴다. STORY는 Editorial 블록 구조(`EditorialPerson`과 같은 형태) 재사용이 맞다 |
| 10 | 최소 DB 변경 | 아래 4가지(전부 추가만) |

## 2. 최소 DB 변경 (additive)

1. `EditorialThought` + `EditorialThoughtSpace` — PEOPLE과 같은 형태(번호·제목·요약·대표 이미지·블록·연결 공간). 기존 `EditorialPerson`을 일반화하면 `number @unique` 제약 변경이 필요해서 별도 모델로 둔다.
2. `EditorialCuration.perspective` (enum `SITUATION | PURPOSE`, nullable) — 기존 초안 2편은 null로 남고 관리자가 지정.
3. `EditorialSpace.story` (Json 블록, 기본 `[]`) — 함께한 공간의 "운영자 전체 이야기"(웹 정본).
4. `SavedEditorialSpace` (userId, editorialSpaceId, createdAt, unique) — 공개 공간 저장. 운영 `SavedSpace`는 그대로 두고 아카이브·추천에서 slug로 합친다.

## 3. 구분

**그대로 재사용**: Editorial CMS 모델·블록 렌더러·관리자 폼(EditorialDocForm, BlockEditor, SpacePicker), `recommend.ts` 벡터 함수, `SavedSpace`, `archiveSpaceNotes.ts`, Cube QR→Story→Guestbook 흐름 전체, `demoData.ts` 필터, `ENABLE_EDITORIAL_HOME` 공개 스위치.

**수정**: Navbar(스토리/큐레이션/함께한 공간/추천/내 아카이브), EditorialHome(브랜드 문장·LATEST 유지 + STORY/CURATION/함께한 공간 프리뷰), `/curation`(지역 우선 허브), `/curation/[slug]`·`/spaces/[slug]`(저장 버튼, 파트너 이야기), `/people`(→ STORY 허브), 관리자 큐레이션 폼(관점), 관리자 공간 폼(운영자 이야기·태그 제안), `/archive`(방문/저장/흔적 중심), 아카이브 탭에서 "내 취향" 분리.

**신규**: `/story`(ALL/PEOPLE/THOUGHT), `/thought/[slug]`, `/cube-spaces`(함께한 공간), `/recommend`(지역별 추천), 저장 API·SaveButton, `src/lib/discoveryRecommend.ts`(설명 가능한 태그 이름 매칭, 단위 테스트), `src/lib/editorial/area.ts`(지역명 정규화), 관리자 THOUGHT CRUD.

**이번에는 구현하지 않음**: 공간 상세 조회·지도 클릭 계측(약한/중간 신호), AI 추천, 신규 taxonomy 테이블(기존 Tag 이름을 공통 어휘로 사용), Cube Episode 콘텐츠 단순화(구조는 이미 짧은 현장 이야기를 지원, 원고 작업), 레거시 `/story/[slug]`(ContentStory) 정리, `ENABLE_EDITORIAL_HOME` 공개 전환(발행 콘텐츠 준비 후 운영 판단).

## 4. 추천 로직 (Phase 3·4)

- 신호: 실제 방문 Record(강, 기존 `buildWeightedTasteVector`, 시연 공간 제외) + 저장(중, 운영 `SavedSpace`·`SavedEditorialSpace`)을 **태그 이름** 가중치로 합친다. 운영 태그와 공개 공간의 `tags`·`category`가 같은 어휘(기존 Tag 이름)를 쓰도록 관리자 폼에서 기존 태그를 제안한다.
- 후보: 발행된 `EditorialSpace`, 이미 방문·저장한 곳 제외, 지역 필터(정규화된 area).
- 점수 0인 공간은 추천하지 않고, 이유 문구는 실제로 겹친 태그 이름으로만 만든다. 데이터가 없으면 Empty State(큐레이션·함께한 공간 안내).

## 5. 공개 범위

새 정보 구조(스토리·큐레이션·함께한 공간·추천·새 내비·새 홈)는 기존 `ENABLE_EDITORIAL_HOME` 스위치를 그대로 따른다(지금은 관리자 미리보기). 아카이브 개편은 로그인 사용자 전체에 바로 적용된다. 스위치가 꺼진 동안 `/recommend`는 기존 `/archive/taste`로 보낸다.
