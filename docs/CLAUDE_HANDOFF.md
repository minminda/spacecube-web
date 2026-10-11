# Claude Code Latest Handoff

Updated: 2026-10-11 (사람 탐색 진입 정리 + 검색 문구 + 추천 점수 조사) · 추천 알고리즘·점수·DB·스키마 변경 없음

## UX 변경
- **메뉴**: ☰ 메뉴 "사용자" 그룹 = 내 공간 → **사람** → 설정 (`Navbar.tsx`, 데스크톱·모바일 공통). "콘텐츠"에서는 뺐다. 링크는 그대로 `/find?tab=people`(새 route 없음 — `/people`은 STORY PEOPLE 주소).
- **사람 화면**(`app/find/page.tsx`): "탐색" 제목·공간/사람 탭 제거 → 제목 "사람" + 설명 + 검색 칸 + 추천 그리드(검색어 없이 바로 추천). 공간 탭의 "탐색" 화면에서도 탭 제거.
- **공간 `/find`는 삭제하지 않음**: HOME 선반 `homeData.ts`, `/curation`, `/curators`, 아카이브 큐레이터 블록, 필터 폼, `/recommend`·`/archive/taste*` 리다이렉트가 `/find?area=…`로 계속 보낸다. 제거하면 링크가 깨진다. (정리하려면 이 링크들을 `/search`로 옮기는 별도 작업 필요.)
- **검색 placeholder**: "지역, 공간, 취향, 사람을 검색해보세요"(`SearchView.tsx`, 데스크톱·모바일 동일).
- **사람 검색 1글자부터**: `peopleQuery` 하한 2→1. 서버 검색(닉네임·@handle `contains`), DB 100건 조회 → 관련도 정렬 → **최대 20명**. `User.name`·이메일·ID는 검색 대상 아님. 전체 사용자 클라이언트 전송 없음.
- **`/search` 사람 섹션**: 유지(1글자부터 호출). 공간·지역 검색/코퍼스 캐시 무변경.
- **HOME 사람 Shelf**: 이미 기본 순서의 맨 마지막(`shelfConfig.ts` `similar-people`, 주요 공간·큐레이션·STORY 뒤) → 위치 수정 안 함. 더 보기 → `/find?tab=people`. 제목은 "취향이 비슷한 사람"(관리자 고정 제목) 그대로.
- 추천 이유(`reasonText`, 실제 겹친 공간 이름)는 그대로 유지.

## 추천 점수 조사 (코드 기준, 수정 없음)
### 사람 추천 — `lib/people/rankPeople.ts` `rankPeople` (호출: `peopleData.ts` `loadRankedPeople` → `recommendPeople` / `similarPeopleForHome`)
`score = bothVisited×3 + shared×2 + feelOverlap×2 + min(공개공간수,8)×0.1`
| 신호 | 가중치 | 설명 |
|---|---:|---|
| 같은 공간을 둘 다 다녀옴 | +3 / 공간 | 상대 `visited` && 내 `visited` |
| 같은 공간이 둘 다에 있음(저장·한쪽만 방문) | +2 / 공간 | `mine`(내 방문∪저장)에 있고 위 조건 아님 |
| 결(공간 category+tags) 겹침 | 0~2 | `feelOverlap`: min(빈도) 합 ÷ 작은 쪽 총합 |
| 공개 공간 수 | +0.1×(최대 8) | 동점 완화 |
- 재방문 횟수·Cube/Partner 경험·태그 가중치는 사용 안 함. 동점: 공개공간 수 → handle 순. 내 데이터 없으면(비로그인 등) 공개 공간 수만.
- 이유(reason): 같이 다녀옴>0 → visited / 겹침≥2 → shared / feel≥0.5 → feel / 아니면 null. HOME은 reason 있는 사람만.
- HOME 공간 선반: 비슷한 사람(최대 8명)의 공개 공간에 그 사람 score 합산.

### 공간 추천 (현재 실사용: `/find`, HOME 개인화) — `finder/spaceFinder.ts` `rankCandidates` ← `finderData.getFinderViewer` ← `discoverySignals.getUserDiscoveryContext` → `discoveryRecommend.buildTasteProfile`
`personal = Σ(공간 attr(category+tags+컬렉션 키워드) 중 내 프로필에 있는 attr의 가중치) + 큐레이터 boost`; 정렬 = personal → base(공식 큐레이션 수 + 컬렉션 수×0.5) → 공개 순서
프로필 attr 가중치(이름 정규화 키):
| 신호 | 가중치 | 설명 |
|---|---:|---|
| Cube 방문 Record | tasteScore(1~5, 없으면 3) × SpaceTag.weight | 태그별 합산. **공간당 최신 Record 1개만**(`getLatestRecordPerSpace`) |
| 공개 공간 저장 / 운영 공간 저장 | +2 / attr (`SAVE_WEIGHT`) | 공간 attr마다 |
| 아카이브 "가보고 싶어요" | +2.5 / attr | |
| 아카이브 "다녀왔어요" | +3 / attr | |
| 아카이브에서 직접 고른 태그 | +1 추가 | 기록 무게 위에 |
| 큐레이터 취향 boost | very 1.5 / many 1 / some 0.5 | 큐레이터 프리뷰 권한일 때만 |
- 같은 공간을 운영저장·공개저장·아카이브에 겹쳐 남겨도 1번만 센다(아카이브 우선). 이미 가본/저장한 공간은 목록에서 제외 아닌 "다녀온 공간" 이유 표시(아카이브·저장 id는 추천 제외 집합).
- 지역은 필터(점수 아님). 큐레이션·컬렉션은 base(2순위). 사람 추천에서 파생된 신호는 `/find`에는 없고 HOME 비슷한 사람 선반에서만.

### 답
- **태그 하나 = 단순 +1?** 아니다. 태그(attr)별 가중치가 행동 강도에 따라 다르다(방문=점수×weight, 저장 2, 아카이브 2.5/3, 직접 태그 +1). 같은 attr은 누적 합산, 공간 점수는 겹친 attr 가중치의 합(비율 정규화 없음).
- **가장 강한 신호**: 사람=같은 공간 같이 다녀옴(+3). 공간=Cube 방문 Record(tasteScore 최대 5×태그 weight)가 가장 클 수 있고, 아카이브 다녀왔어요(3)가 그다음.
- **재방문**: 점수 누적 안 함(공간당 최신 Record만). 재방문 자체를 강한 신호로 쓰지 않음. 방문 수는 `visitCount`(요약 표시용)·KPI에만.
- **레거시**: 아래 분류.

### 레거시 분류
1. 현재 실제 사용: `rankPeople`, `rankCandidates`+`buildTasteProfile`+`getUserDiscoveryContext`, `buildWeightedTasteVector`(방문 신호 생성에 재사용), `similarPeopleForHome`.
2. 일부 화면: `lib/recommend.ts`의 `rankSpacesByVector`/`getVectorReason`/`getMatchPercent`/`cosineSimilarity`(Tag.id 벡터) — `/discover`, 방명록 완료 보상(`guestbookReward.ts`), `/archive/taste*`(관리자 또는 `ENABLE_EDITORIAL_HOME` 꺼진 경우만, 공개 시 `/find`로 리다이렉트), `discoverySignals` 간접.
3. 레거시/사실상 미사용(삭제 안 함): `scoreSpace`/`scoreSpaceWeighted`/`rankSpaces`(태그 겹침 0~1), `/recommendation`·`/archive/taste*` 구 화면. 1~5점 취향 점수는 `tasteScore`로 방문 신호에 아직 쓰임.

## 확인
- tsc 클린 · eslint(변경 파일) 클린 · vitest(profile/people) 6 files / 42 tests 통과 · `next build` 미실행.
- **못 한 것**: 이 환경은 클라이언트 하이드레이션이 안 돼 메뉴 열림·모바일 화면·`/search` 사람 섹션(클라이언트 fetch)은 직접 못 봤다. 사용자 확인 필요.

## 남은 이슈
- 1글자 검색은 닉네임 `contains`라 결과가 20명 상한까지 찰 수 있다(정렬은 정확→일부 순).
- 공간 `/find`를 완전히 없애려면 `/find?area=` 링크 이전이 먼저.

## DB
- 변경 없음.
