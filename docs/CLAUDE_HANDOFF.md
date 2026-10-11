# Claude Code Latest Handoff

Updated: 2026-10-11 (레거시 정리 + 세부 완성도 세션) · 코드 커밋 a49b0b9 · 신규 기능 없음

## 이번 세션 요약
audit → mapping → cleanup 순서로 운영 DB를 점검하고, 비파괴로 정리할 것만 정리. fixture / isDemo / 실제 사용자 데이터는 삭제·축소하지 않음.

### 데이터 분류 (운영 DB 읽기 전용 조사)
1. **운영**: 실공간 6곳(EditorialSpace, 전부 Partner · 태그 0개), 큐브 GC-001~036(연결 6), 실사용자 19명, SpaceScan 427.
2. **Admin canonical**: Tag 33개(분류 5), Category 5, District(아래).
3. **legacy/stale**: districts 불일치 행(정리함) · 운영 공간 district "처인구"(정리함) · `editorial_home_settings` 1행(heroSpaceId/featuredSpaceIds/feed — **앱 코드가 읽지 않음**, 보류) · HomeShelf 0행.
4. **fixture/demo**: EditorialSpace isDemo 23곳(태그에 정본에 없는 문자열 5종: 오래 머무는·밤·감각적인·둘이·비 오는 날 — fixture라 그대로 둠), 운영 Space isDemo 15곳, isDemo 사용자 60명.

### DB 변경 (실제 실행, 삭제 없음 — `scripts/cleanup-legacy-regions-2026-10-11.ts`, idempotent)
- districts: "용인"/mangwon → **"용인 처인구"/yongin-cheoin**(order 2)로 수정, **연남동/yeonnam(0)·망원동/mangwon(1)** 추가(ACTIVE). 결과 3행.
- 운영 Space `aka-coffee-room`.district "처인구" → "용인 처인구"(표기 통일 1건).
- Tag·EditorialSpace·Record·Scan·Saved·Guestbook·fixture **변경 없음**. 실공간은 태그 0개라 치환할 값 자체가 없었음.

### 태그 정책
- 공간 등록 저장(POST/PATCH `/api/admin/editorial/spaces`)에서 **활성 Admin Tag에 없는 새 문자열은 400**. 그 공간에 이미 있던 과거 태그는 유지 가능(다른 필드 저장이 막히지 않게). 대소문자·공백은 정본 표기로 맞춤(`checkSpaceTags`, 테스트 추가).
- 태그 삭제는 시연·보관 공간의 사용까지 확인(`countAllEditorialTagUsers`) — 문자열이 조용히 고아가 되지 않음.
- 태그 관리 상단에 "관리에 없는 태그가 공간에 남아 있어요" 안내(공개 공간 한정, 없으면 안 보임).
- **삭제한 태그 없음.** 정리 후보로만 보고: `북카페`(공간 유형, 사용 0), `전시공간`(이미 비활성, 데모 2곳 사용), 새 분류 태그 다수(사용 0 — 의도된 seed). `독립서점`은 실공간(북눅 연남) 유형인데 "공간 유형" 태그에는 없음 → 사용자 결정 필요.

### 성능
- 사람 추천 후보별 6쿼리 제거: `getLibraries`(archive/library.ts) · `publicSpaceRowsMany`(profile/profileData.ts)로 일괄 조회, `personCards`도 행 조회 일괄화. 추천 규칙(rankPeople)은 불변, 결과 동일 확인.
  - 로컬→Neon 실측(후보 수는 현 데이터): HOME `similarPeopleForHome` **209 → 28 쿼리, 8.5s → 5.7s** · `/find` 사람 탭 **236 → 30**(데모 포함 6.0s → 4.7s) · 실사용자만 **152 → 27**(4.9s → 3.3s). 쿼리 수는 이제 후보 수와 무관(상수). 남은 시간은 쿼리당 원격 지연(~200ms).
- 검색 말뭉치 캐시: 일반 방문자만 30초 TTL(인스턴스 메모리), 관리자·fixtures 미리보기는 캐시 안 함. 공간·큐레이션·태그·지역 저장 시 `invalidateSearchCorpus()`로 해당 인스턴스는 즉시 갱신(다른 인스턴스는 최대 30초). 새 인프라·스키마 없음.

### QR
- `SC-####`는 2026-07-12 개발 초기 형식. 큐브가 **SC-0001 1개뿐, UNASSIGNED(공간 미연결)**였고 2026-07-19 커밋 65f3750에서 GC-001로 마이그레이션(prisma/migrate-cube-code-prefix.ts). 감사 문서(2026-07)에서도 "연결 안 된 테스트 큐브"로 기록 → 실제 인쇄 증거 없음. **호환 코드 추가하지 않음.** (사용자가 그 전에 SC-0001을 개인적으로 출력했는지는 코드로 알 수 없음.)

### 선정 이유 — 공간 상세에 노출하지 않음
선정 이유(HomeShelfSpace.note / 큐레이션 연결 메모)는 "그 선반·큐레이션에 왜 있는가"라는 맥락 정보라 공간마다 하나로 정해지지 않고 큐레이션마다 달라짐. 상세에는 이미 한 줄 소개 + 공간 소개 + "이 공간이 소개된 이야기"(큐레이션 링크)가 있어 중복. 상세는 정보량이 중요해서 숨김 유지.

### 사용자 화면 변경
- 공간 상세: 영문 라벨 "About this space/Information" → "공간 소개/정보", 지역 표기를 HOME과 같게 정규화("연남동"→"연남"), Partner 심볼의 접근성 문구를 "공간큐브가 있는 공간"으로(내부어 "Partner" 노출 제거).
- 빈 상태 어투 통일(`~없어요`): 사람 검색·사람 추천·공간 필터·전체 기록 검색.
- 확인만 하고 유지: 상세 구조(헤더→대표 이미지+우측 상단 저장→소개→정보→지도→Episode), QR 전 EP 제목 클릭=현장 안내 창 / QR 후 Episode 이동, 공개 상세에 방명록 CTA·수·방문자 수 없음, 로그인 안내 문구, 검색 0건 안내.

### 관리자 변경
- 태그 관리: 정본 밖 태그 안내 · 삭제 보호 강화(위). 지역 관리는 올바른 3행으로 채워져 "공간 등록 지역 선택지"가 실제 지역과 일치.
- 공간 등록: 서버가 태그 정본 검증(UI는 이미 칩 선택).
- Admin 전면 개편 없음. HOME 선반·Curation·Episode·KPI는 **코드 수준 확인만**(삭제 보호는 Curation·태그·지역에 이미 있음) — 로그인이 필요한 화면이라 실제 클릭은 못 함.

### 확인된 사실 (구분)
- 일반 방문자 화면은 isDemo를 `curatorAccess`(관리자 또는 NODE_ENV=development)일 때만 포함 → 프로덕션 방문자에게 fixture/데모 노출 없음. KPI(`discoveryKpi`·admin 집계)는 isDemo 제외. (코드 기준 확인, 프로덕션 URL 실측은 안 함)
- 사람 추천은 isDemo 사용자를 `includeDemo`(관리자·로컬)일 때만 섞음.

## 직접 확인 필요
- 관리자 로그인 후: 공간 등록→태그 선택→저장(태그 400 메시지 확인), 지역 관리에서 3개 지역 표시, 태그 관리 상단 안내(지금은 실공간에 정본 밖 태그 0이라 안 보이는 게 정상).
- 로그인 상태 HOME/사람 탭 결과가 이전과 같은지(쿼리만 바꿨고 로컬 데이터로 동일 확인했지만 실사용자 화면은 직접).
- 이 환경의 브라우저는 스트리밍 `LOADING_` 때문에 검색·내 공간 화면을 못 봄 — 빈 상태는 코드로 확인.
- 이미 SC- 스티커를 인쇄해 붙인 적이 있는지.

## 사용자 결정이 필요한 항목
- `독립서점`을 "공간 유형" 태그로 추가할지, `북카페`(사용 0)를 둘지.
- fixture 태그 5종("감각적인"→감각 있는, "오래 머무는"→오래 머물기, "밤"→저녁, "둘이"→대화/데이트, "비 오는 날"=대응 없음)을 정본으로 맞출지(fixture라 이번엔 미적용; HOME 테마 키워드 "밤"은 이 fixture 문자열에도 걸림).
- `editorial_home_settings` 1행(앱이 안 읽음)을 지울지.
- 공간 상세에서 제목/요약을 이미지 위에 둘지(현재) 이미지 아래로 둘지.

## Verification
- tsc 클린 · 변경 파일 eslint 클린 · vitest **104 files / 986 tests** 통과 · 브라우저(localhost, 비로그인): HOME·`/spaces/booknook-yeonnam` 렌더 확인, 콘솔 에러 없음. `next build`·`prisma db push` 미실행(스키마 변경 없음).
