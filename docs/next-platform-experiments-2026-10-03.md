# 다음 플랫폼 실험 정리 (2026-10-03)

안정 기준점: **git tag `archive-v1-stable` → 커밋 `aca77d7`** (tsc 0 · 테스트 469 · build 성공).
문제가 생기면 `git checkout archive-v1-stable`로 코드를 비교·복구한다. DB 복구는 [db-backup-restore-2026-10-03.md](db-backup-restore-2026-10-03.md).

표기: **현재 구현**(일반 사용자에게 동작) · **Prototype**(관리자·로컬 미리보기에서만) · **Future**(아직 없음)

## 현재 구현

| 영역 | 상태 | 비고 |
|---|---|---|
| QR / Cube 실제 경험 | 현재 구현 | `/c/[code]` → 대표 이야기 → 방명록, 12시간 잠금 |
| Guestbook | 현재 구현 | 비로그인 작성·공감·답글, 운영자 숨김 |
| Story(PEOPLE/THOUGHT) · 공식 Curation · 함께한 공간 | 현재 구현(공개 스위치 꺼짐) | `ENABLE_EDITORIAL_HOME=false` — 관리자 미리보기. 발행 STORY 0편, 큐레이션 초안 2편 |
| Save | 현재 구현 | 공개 공간 저장(SavedEditorialSpace) + Cube 상세 저장(SavedSpace) |
| Recommendation V1 | 현재 구현 | 방문·저장·아카이브 신호의 태그 이름 매칭, 설명 가능한 이유만 |
| Archive V1 + 개인 공간 아카이브 | 현재 구현 | 사진·링크로 추가, 기존 공간 자동 매칭, 방문 여러 번, PRIVATE |
| Demo data 격리 | 현재 구현 | `Space/User/EditorialSpace.isDemo`, 공개 쿼리 전부 제외 |
| SpaceCube Original 허브 | 현재 구현(공개 스위치 따름) | `/spacecube` — STORY · CURATION · 함께한 공간 · Cube 경험 |

## 다음 핵심 실험

### 1. Curator / Collection — Prototype (구조는 있음, 검증 전)
- 구조: `User → (선택) CuratorProfile → CuratorCollection → EditorialSpace`
- 원칙: 모든 큐레이터는 User다. 큐레이터도 저장·방문·추천을 똑같이 쓴다.
- 지금 있는 것: 가상 큐레이터 4명·컬렉션 11개·가상 공간 23곳(isDemo), `/curators` `/collections/[slug]` `/find`, 추천·아카이브의 Prototype 블록. 스위치 `ENABLE_CURATOR_PROTOTYPE=false`.
- 검증 질문: 취향 있는 사람들의 공간 선택을 따라가는 방식이 실제 공간 탐색에 도움이 되는가?

### 2. 공간 취향 플랫폼 IA — Prototype
- 상단(플랫폼): 공간 찾기 · 큐레이터 · 추천 · 내 아카이브 — 큐레이터 미리보기 권한이 있을 때만 이 구성으로 바뀐다.
- 하단(Original): "공간큐브" → `/spacecube` 허브(스토리 · 큐레이션 · 함께한 공간 · Cube 경험).
- 미리보기가 아닌 방문자에게는 기존 상단 구성(스토리 · 큐레이션 · 함께한 공간 · 추천)이 유지된다.

### 3. SpaceCube Original — 현재 구현(유지)
공간큐브가 직접 만드는 STORY · 공식 CURATION · 함께한 공간 · Cube Experience를 플랫폼 안의 공식 브랜드 영역으로 유지한다.
경로(`/story` `/curation` `/cube-spaces`)는 바꾸지 않는다.

### 4. 실제 큐레이터 검증 — Future
- 실제 큐레이터 후보 조사 → 3~5명 접촉 → 컬렉션 데이터 확보 가능성 검증
- 시작 전: 가상 데이터 정리(`npm run db:cleanup-curator-prototype`), 관리자 `/admin/curators`에서 실제 사용자에게 프로필 붙이기, 컬렉션 편집 관리자 UI(아직 없음 — 지금은 seed 스크립트가 편집기)

## Later — Future (구현되지 않음)
- Instagram Import (게시물 → 공간 매칭 → `CuratorCollectionSpace.sourceUrl`)
- Naver Place Matching (외부 장소 API → `findSpaceMatches` 확장)
- 외부 공간 자동 매칭 / 개인 기록 → 공개 공간 승격 관리자 화면(`ArchiveEntry.placeKey` 기준)
- Recommendation 고도화(약한 신호: 상세 조회·지도 클릭 계측)
- Curator Marketplace

## Curator Prototype을 다시 시작할 때 볼 곳
- 접근·공개: `src/lib/features.ts`(`ENABLE_CURATOR_PROTOTYPE`), `src/lib/curators/access.ts`
- 데이터: `prisma/schema.prisma`의 CuratorProfile/CuratorCollection/CuratorCollectionSpace, `prisma/seed-curator-prototype.ts`
- 조회·로직: `src/lib/curators/{queries,finder,affinity,viewerTaste}.ts`
- 화면: `src/app/{curators,collections,find}/`, `src/components/curators/`, `/recommend`·`/archive`의 Prototype 블록
- 내비: `src/components/Navbar.tsx`(PLATFORM_NAV_ITEMS / ORIGINAL_NAV_ITEMS), `src/components/editorial/SiteFooter.tsx`
- 설계 노트: `docs/curator-prototype-2026-10-03.md`, `docs/personal-archive-2026-10-03.md`
