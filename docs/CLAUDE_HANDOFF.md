# Claude Code Latest Handoff

Updated: 2026-10-11 (전수 점검 세션 — 신규 기능 없음, 명백한 버그 2건만 수정)

## 이번 세션
HOME / Search / Space Detail / Region / Tag / KPI / QR 흐름을 코드 + 브라우저(비로그인) + 운영 DB **읽기 전용**으로 점검. 운영 DB 쓰기·fixture 삽입 없음(점검 전후 행 수 동일), 임시 스크립트는 삭제함.

### 수정한 버그
1. **저장 상태 불일치** — Cube 상세(`/space/[slug]`)에서 저장하면 `SavedSpace`에만 쌓여, 공개 화면(HOME·`/spaces/[slug]`·검색·`/find`)의 저장 아이콘 / "내가 찜한 공간" / 추천 제외에 반영되지 않았음(운영 DB에 11건 해당). `editorialIdsBySlugs`(src/lib/editorial/saves.ts)로 slug 연결해 `getSavedEditorialSpaceIds`와 `discoverySignals.savedEditorialIds` 양쪽에 합침. 공개 화면에서 저장 해제하면 같은 slug의 `SavedSpace`도 같이 해제(`DELETE /api/saves/spaces/[spaceId]`). 테스트 `saves.test.ts` 신규.
2. **빈 Episode 블록** — Partner(`cubeAvailable`)인데 운영 Space/공개 Episode가 없으면 상세에 "Episode" 제목만 남던 것을 블록째 숨김.

### 확인된 사실 (운영 DB, 읽기 전용)
- `discovery_events` 테이블은 **이미 운영 DB에 존재**(행 0). `getDiscoveryStats` 전체/공간별 모두 실제 쿼리 성공.
- 공개 EditorialSpace: 실제(비데모) **6곳 전부 Partner·태그 0개**(연남동 3·망원동 2·용인 처인구 1) + isDemo 23곳(태그 있음, 이미지 없음). 일반 방문자 HOME/검색은 이 6곳만 본다.
- `districts` 1행: name "용인", slug "mangwon" — 이름·slug 불일치(데이터 정리 필요). HOME/검색 지역 목록은 District가 아니라 공간의 area에서 만들어진다.
- 태그 33개(공간 유형 7 포함, 4개 분류 26개) 정상. 큐브 GC-001~036, 연결 6.
- 큐브 코드는 `GC-###`만 존재 — 예전 `SC-####` QR URL은 "등록되지 않은 큐브" 안내로 끝남(호환 없음).

## 직접 확인 필요 (에이전트가 못 한 것)
- 관리자·로그인 흐름 전부(공간 등록→Curation→EDITORIAL 선반, 로그인 후 저장/관심 지역/내 공간, 지역·태그 CRUD 실제 클릭). 코드·권한(비로그인 401/redirect)만 확인.
- 실제 QR 스캔→Unlock→Episode→Record(운영 데이터를 쓰므로 실행 안 함).
- 이미 인쇄·부착된 `SC-####` 스티커 유무.
- 프로덕션 빌드 기준 HOME 페이로드(dev HTML 1.36MB, RSC 1.07MB — dev는 부풀려짐).
- 이 환경 함정: dev 페이지가 `LOADING_`에서 안 넘어가면 `computer screenshot`을 한 번 찍어야 스트리밍 swap이 일어남. 숨겨진 `<main>`은 hydrate 안 된 상태라 클릭 테스트 불가.

## 규모 증가 시 한계 (순수함수 시뮬레이션 + DB 실측)
- 선반 수는 상한이 있음(테마 ≤9, 지역 ≤3 …) → 공간이 늘어도 선반이 무한히 늘지 않음. 선반 구성·중복 완화는 1000곳도 20ms 미만.
- 같은 공간 반복: 29~59곳에서는 구조적으로 많이 반복(59곳 기준 최대 4회, 실제 비데모 6곳이면 거의 모든 선반이 같은 공간). 약 75곳부터 최대 2회 이하, 100곳 이상이면 해소.
- 검색: 요청마다 전체 풀 + 큐레이션 링크를 DB에서 다시 로드. 점수 계산은 300곳 18ms/질의, 1000곳 55ms/질의(설명 400자 가정).
- **병목 1순위는 공간 수가 아니라 활동 사용자 수**: `similarPeopleForHome`은 후보당 ~6쿼리(최대 40명=~240쿼리, 로컬→Neon 5.8s), `/find` 사람 탭은 최대 200명=~1200쿼리.
- 분류: 지금 문제 없음 = 선반/중복 완화/태그 매칭/지역 필터/KPI 집계(현재 규모) · 50~100곳 개선 = 검색 풀 매 요청 로드(캐시) · 공개 프로필 50명 안팎 = 사람 추천 N+1 · 300곳 이상 = 검색 전체 로드/`listSpaces` 전체 조회 구조 변경 검토.

## KPI 메모
- 같은 방문자·공간·종류 30분 중복은 쓰기 시점에 무시, 집계는 "명". 중복 확인은 find→create라 거의 동시 두 요청이면 둘 다 기록될 수 있음(명 기준 집계엔 영향 없고 회 수만 +1).
- Map Click→7일 내 QR: 비로그인은 anon 쿠키 12시간이라 하루를 넘기면 연결 끊김(알려진 한계).

## 사용자 결정이 필요한 항목
- 공간 상세에 "선정 이유"를 보여줄지(지금은 HOME 카드/검색 결과에만, 상세에는 없음).
- 태그 이름 변경 ↔ HOME 테마: 테마는 키워드 문자열 매칭이라 태그명을 바꾸면 테마 소속이 조용히 바뀜(테마 연결 키워드 관리에서 수동 보정).
- 실제 공간 태그 입력(전체 0개), districts 행 정리, Partner 6곳 "운영자의 이야기"(story) 비어 있음.

## Verification
- tsc · eslint(변경 파일) 클린, vitest 104 files / 982 tests 통과. `next build`·`prisma db push` 미실행.
