# Claude Code Latest Handoff

Updated: 2026-10-12 (Gap Analysis TOP 1 — Space Detail = 이 공간의 목차 + 내 기록의 입구) · DB·스키마·API 변경 없음

## 한 일
- **순서 변경** (`src/components/editorial/SpaceDetail.tsx`): 머리·대표 사진 → **내 공간 줄** → **공간큐브가 고른 이유** → **이 공간이 소개된 이야기**(맨 아래에서 위로) → 공간 소개·정보·공간큐브(Episode) → 운영자의 이야기 → 사진 → **함께 소개된 공간**. 데스크톱 그리드·머리·대표 사진은 그대로.
- **고른 이유**: `getStoriesForSpace`가 이미 가져오던 큐레이션의 `EditorialCurationSpace.note`. 큐레이션 순서 = `number DESC`(HOME `homeData.ts` notes 맵과 같은 규칙) → 첫 note 1개만 인용 + 「큐레이션 제목」에서(→ `/curation/[slug]`). note 없으면 블록 자체 숨김. 순수 함수 `src/lib/editorial/spaceDetailLinks.ts` `pickSpaceReasons`.
- **소개된 이야기 카드**: 유형·번호 + 제목 + 한 줄(CURATION=이 공간의 note, 위에서 이미 인용한 큐레이션은 같은 문장 반복 대신 큐레이션 요약 / PEOPLE·THOUGHT=기존 summary). 2줄 clamp, 모바일 썸네일 120→88px.
- **내 공간 줄** (`src/components/editorial/SpaceRelation.tsx`, 클라이언트): 문장 우선순위 N번 다녀온 곳(2회+) > 한 번 다녀온 곳 > 내 공간에 저장한 곳 > 문장 없음. 버튼 = 저장(기존 `SaveButton` text 변형 재사용, `onChange` prop만 추가) + 다녀왔어요/또 갔어요 + 기록이 있으면 "내 기록 보기 →"(`/archive/p/s-<slug>`). 대표 사진 위 저장 아이콘은 이 줄로 **옮김**(상세에 저장 버튼 1개). 상태 계산은 서버 `getMySpaceState`(`src/lib/archive/entries.ts`) = 공간 추가 검색과 같은 `myStateOf`(내 기록 방문 + 같은 slug 운영 공간 Cube Record).
- **다녀왔어요 / 또 갔어요**: 기존 `POST /api/archive/entries { spaceId, status: "VISITED" }` 그대로 — 기록 없으면 만들고 있으면 덧붙이며 방문 1건(날짜 없음 = "기록한 날")을 남김. 새 API 없음. 응답 뒤 화면 즉시 갱신(새로고침 없음), 한 화면에서 1회만(연속 탭 중복 방지), "날짜 · 사진 · 메모는 내 기록에서" 안내. 비로그인 = 기존 `/login?callbackUrl=<현재 주소>`(로그인 후 자동 실행은 TOP 2라 안 함).
- **공간큐브 한 줄**: Partner면 정보 아래 블록 제목 "공간큐브가 있는 공간 ◆" + "현장에서 공간큐브의 QR을 찍으면 이 공간의 Episode가 열려요."(Episode 없으면 "…QR로 이 공간의 이야기를 만날 수 있어요."). 인증·등급 표현 없음. 비 Partner는 블록 없음.
- **관련 공간**: ① 같은 큐레이션에 함께 소개된 공간(큐레이션 순서 → 큐레이션 안 order) ② 모자라면 같은 지역. 자기 제외·중복 제거·최대 3. 제목 = 함께 소개된 공간 / ○○의 다른 공간 / (섞이면) 이어서 볼 공간. `relatedSpacesFor`.

## 검증
- tsc 통과, 변경 파일 eslint 통과, vitest `src/lib/{editorial,archive,home,search}` 203개 통과(신규: `spaceDetailLinks.test.ts`, `spaceRelation.test.ts`(상태 문장 + 다녀왔어요 요청 본문 파싱), `mySpaceState.test.ts`).
- 로컬 dev(운영 DB) + isDemo 테스트 사용자/DB 세션으로 실제 클릭 확인: 기록 없음 → 다녀왔어요 → "한 번 다녀온 곳이에요"+내 기록 보기 → 새로고침 유지·"또 갔어요" → 저장 → 또 갔어요 → "2번" + 두 번째 탭 차단 → 아카이브 상세 "다녀왔어요 · 2번"·방문 2건. 비로그인 클릭 → `/login?callbackUrl=%2Fspaces%2Fbooknook-yeonnam`. 375px(iframe)·1280px 화면 확인, 가로 넘침 없음. 비 Partner는 fixture 공간, note 없는 공간은 아카커피룸(고른 이유·관련 공간 없음, THOUGHT만)으로 확인. 콘솔 에러 없음.
- 테스트 데이터 정리 완료(테스트 사용자 cascade 삭제 + 상세 조회 DiscoveryEvent 1행 삭제, 익명 행 0).
- `next build` 미실행 — build 스크립트가 `prisma db push`를 먼저 돌림(이번 스키마 변경 없음).

## 결정이 필요한 것 / 메모
- 공간 상세의 "다녀왔어요"는 날짜 없이 1건을 남긴다(아카이브의 기존 정책). 날짜·사진은 내 기록에서 — 상세에 입력 폼을 둘지는 반응을 보고 결정.
- 대표 사진 위 저장 아이콘을 없앴다(내 공간 줄로 이동). 저장 위치 체감이 나쁘면 아이콘 복귀 + 줄에는 상태만 두는 방식으로 되돌리기 쉬움.
- 북눅처럼 이야기 7편인 공간은 모바일에서 목록이 약 1화면 길이. 더 늘면 "더 보기"를 고려.
- 맨 아래 "더 많은 공간 이야기는 Instagram에서 →"는 TOP 2 범위라 그대로 둠.

## 배포 후 확인할 것
1. 북눅 상세: 사진 아래 저장·다녀왔어요, 그 아래 고른 이유(「공간 자체를 보러 가고 싶은 곳」에서) → 링크가 큐레이션으로 감.
2. 소개된 이야기가 공간 소개보다 위, CURATION 4·PEOPLE 2·THOUGHT 1, 첫 큐레이션 한 줄은 요약(인용 반복 없음).
3. 로그인: 다녀왔어요 → 즉시 "한 번 다녀온 곳이에요" + 내 기록 보기 → 내 공간 상세에 방문 1건.
4. 재방문: 다시 들어오면 "또 갔어요" → "2번 다녀온 곳이에요". 내 공간 지도/리스트의 상태도 맞는지.
5. 비로그인: 다녀왔어요 → 로그인 → 같은 상세로 복귀(자동 기록은 안 됨이 정상).
6. 녹화버튼: 함께 소개된 공간 = 턴다운서비스·다시점. 아카커피룸: 고른 이유·관련 공간 없음.
7. 공간큐브 블록 문장 + Episode 잠금 안내 창 정상. 데스크톱 HOME에서 연 상세 창(modal)도 같은 구성.
