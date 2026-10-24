# 망원 시연 구성 — 변경 전 상태 백업과 복원 절차 (2026-10-24)

> 민감정보 · 사용자 개인정보는 기록하지 않았다. 아래 주소 · 좌표는 이미 공개된 공간 정보다.
> 이 문서의 "변경 전" 값은 `scripts/seed-demo-spaces.ts --apply` 실행 **직전**에 운영 DB를 읽어 기록한 것이다.

## 1. 무엇을 바꿨나 (요약)

| 구분 | 변경 | 되돌리는 방법 |
|---|---|---|
| 시연용 가상 공간 11곳 | **EditorialSpace 새 행 11개 추가**(`isDemo=true`, slug 접두어 `demo-`, `cubeAvailable=false`, 주소·지도·운영시간 없음). 이전에는 코드 fixture(`src/lib/home/fixtures.ts`, DB 행 없음)였다. | §4-B |
| 실제 Partner 6곳 | **`tags`만** 빈 배열 → 3~5개(빈 경우에만 채움). 지역·주소·좌표·그 밖의 필드는 변경 없음. | §4-C |
| 망원 지역 통합 | **DB 변경 없음.** 코드의 "시연 지역 모드"(`ENABLE_PUBLIC_DEMO_SPACES`)가 탐색 분류만 망원으로 모은다. 카드·상세·지도·길찾기는 원본 지역·주소·좌표 그대로. | §4-A |
| 코드 | isDemo 공개 경로 확장(`src/lib/demoSpaces.ts`), fixture 제거, 시연 콘텐츠를 DB 공간에 연결 | §4-D |

기존 사용자 데이터(저장 · 방문 · Record · 방명록 · KPI 원시 데이터)와 Partner의 Space · Cube · Episode는 변경하지 않았다.

## 2. 변경 전 상태

### 2-1. Partner 6곳 — 지역 · 주소 · 좌표 · 태그 (변경 전 = 변경 후, 태그만 바뀜)

EditorialSpace(공개 화면) 기준. 운영 Space의 `district` · `location` · `lat/lng`도 같은 값이며 **수정하지 않았다**.

| slug | 이름 | 유형 | EditorialSpace.area | 주소(EditorialSpace.address) | 운영 Space.district | 운영 Space 좌표(lat, lng) | 변경 전 태그 |
|---|---|---|---|---|---|---|---|
| `nokhwabutton` | 녹화버튼 | 촬영장비 | 망원동 | 서울 마포구 희우정로20길 22-13 1층 101호 | 망원동 | 37.555524, 126.901595 | `[]` |
| `dasijeom` | 다시점 | 복합문화공간 | 망원동 | 서울 마포구 월드컵로29길 51 3층 | 망원동 | 37.559094, 126.903513 | `[]` |
| `booknook-yeonnam` | 북눅 연남 | 독립서점 | 연남동 | 서울 마포구 월드컵북로6길 93 2층 203호(2.5층) | 연남동 | 37.560455, 126.922819 | `[]` |
| `aka-coffee-room` | 아카커피룸 | 카페 | 용인 처인구 | 경기 용인시 처인구 명지로 5 2층 | 용인 처인구 | 37.235534, 127.189219 | `[]` |
| `turndown-service` | 턴다운서비스 | LP카페 | 연남동 | 서울 마포구 동교로50길 7 반지층 | 연남동 | 37.563819, 126.926609 | `[]` |
| `inner-discovery` | 내면의 발견 | 복합문화공간 | 연남동 | 서울 마포구 월드컵북로5길 53 | 연남동 | 37.556087, 126.916048 | `[]` |

- 6곳 모두 `status=PUBLISHED`, `isDemo=false`, `cubeAvailable=true`. 지도 링크(`mapUrl`)와 운영시간도 있으며 변경하지 않았다(값은 DB에 그대로 있음).
- 같은 DB에서 변경 전 건수: EditorialSpace 29(그중 `isDemo=true` 23 = 사진 없는 프로토타입 `proto-*`), SavedEditorialSpace 0, ArchiveEntry 41.

### 2-2. 새 태그 (Partner 6곳) — 변경 전 `[]` → 변경 후

| slug | 변경 후 태그 | 근거(Episode · Scene · 유형에서 읽히는 것만) |
|---|---|---|
| `nokhwabutton` | 독특한, 대화, 영감 있는, 오래 머물기 | 캠코더 대여 · 공간과 대화 이야기 · 인터뷰 카드 · 기록을 보는 한 시간 |
| `dasijeom` | 책, 조용한, 혼자, 영감 있는 | 공유서재 · 조용히 사색하고 책을 보는 시간 |
| `booknook-yeonnam` | 책, 조용한, 혼자, 편안한, 작은 공간 | 독립서점 · 한 팀만을 위한 공간 · 꼭 책을 읽지 않아도 편안하게 |
| `aka-coffee-room` | 커피, 감각 있는, 다시 오고 싶은, 편안한 | 카페 · 세 가지 분위기 · 다시 오고 싶다는 손님의 말 |
| `turndown-service` | LP, 음악, 대화, 편안한 | LP카페 · LP · 음악을 듣고 이야기 |
| `inner-discovery` | 커피, 영감 있는, 독특한, 혼자 | 커피 한 잔 동안 나를 생각하는 시간 · 물로 경계를 나눈 공간 |

태그는 관리자 태그 정본(활성 Tag) 이름만 썼다. 스크립트는 정본에 없는 이름이 있으면 중단한다.

### 2-3. fixture 공간(가상 11곳)의 이전 상태

- 위치: `src/lib/home/fixtures.ts`의 `DEMO_SEEDS`(코드 데이터). DB 행 없음. slug `fixture-1`~`fixture-11`, id `fixture:N`.
- 저장 · 다녀왔어요: 화면 안에서만 바뀌고 서버에 기록하지 않았다(mock). 개인화 후보에도 들어가지 않았다.
- 시연 콘텐츠(`demoContent.ts`)는 이 fixture id를 가리켰다.
- 이 이전 구현은 git 커밋 `3d52683`~`68dc494`(및 그 이전 `a5af0b2`)에 그대로 있다.
- 새 구현의 slug 대응: `fixture-1 창가의 오후 → demo-window-afternoon`, `2 쪽지와 음반 → demo-notes-records`, `3 슬라이드 룸 → demo-slide-room`, `4 물가의 창 → demo-water-window`, `5 서가 뒤의 창 → demo-shelf-window`, `6 찻잔 선반 → demo-teacup-shelf`, `7 만년필과 우체통 → demo-pen-postbox`, `8 재즈 음반장 → demo-jazz-shelf`, `9 종이 아카이브 → demo-paper-archive`, `10 구형 카메라 진열 → demo-camera-display`, `11 초록 서가 → demo-green-shelf`.

### 2-4. 추천 데이터 필터 · 화면 표시 정책 (변경 전 → 변경 후)

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 공개 Discovery 후보(HOME · 검색 · 추천 · 상세) | `isDemo=false` 공간만. 가상 공간은 코드 fixture로 별도 합침 | `isDemo=false` **또는** (`isDemo=true` 이고 slug가 `demo-`로 시작) — `publicSpaceFilter()`(`src/lib/demoSpaces.ts`). `proto-*` 프로토타입은 계속 제외(관리자·로컬만) |
| 저장 · 다녀왔어요 · 내 공간 · 방문 기록 | fixture는 저장 안 됨(mock) | 일반 공간과 같은 API · 테이블(SavedEditorialSpace · ArchiveEntry/Visit) |
| 개인화 추천 후보 · 취향 신호 | fixture 제외 | 후보에 포함, 저장 · 방문이 취향 신호로 사용됨 |
| KPI(Discovery KPI · 관리자 합계 · 월간 리포트) | fixture는 DB 밖이라 자동 제외 | 코드 변경 없음 — 쿼리가 `isDemo=false`만 센다(시연 공간 조회 · 저장 · 지도 클릭은 집계 제외, 조회 이벤트도 기록하지 않음) |
| 공개 프로필(`/@handle`) | fixture 없음 | 시연 공간은 공개 프로필에서 계속 제외(`publicProfile.ts`의 isDemo 규칙 유지) |
| 지역 | 지역 목록 중 망원만 이용 가능 모드 도입(10/24 오전) | 그대로. DB 지역은 바꾸지 않고 탐색 분류만 모음 |
| 표시 | 카드 "시연용 공간" + 상세 배너 | 같음(`isDemo` 기반). 상세 주소는 "위치 정보 준비 중" |

## 3. 원본 주소 · 좌표 보존 방식

- `originalRegion / originalAddress / originalCoordinates`에 해당하는 값은 **원래 필드(EditorialSpace.area · address, 운영 Space.district · location · lat/lng)에 그대로 남아 있다.** 별도 컬럼을 추가하지 않았다(스키마 변경 없음).
- `displayRegion(망원 시연 분류)`은 DB에 저장하지 않고 코드에서 계산한다: `ENABLE_PUBLIC_DEMO_SPACES`가 켜져 있으면 HOME·검색의 지역 선택은 망원만 활성이고 모든 공간이 망원 컬렉션에 모인다(`src/lib/home/shelves.ts`의 `applyDemoRegion`, `homeData.ts`의 `regionMode`).
- 상세 페이지와 내 공간 지도는 원본 지역 · 주소 · 좌표를 쓴다. 가상 공간은 주소 · 좌표가 없다("위치 정보 준비 중", 지도에서 빠짐).

## 4. 원상복구 절차

> 어떤 단계도 사용자의 저장 · 기록 · 방명록 · Record 데이터를 지우지 않도록 설계했다. 복구 전에 해당 단계의 "영향"을 확인한다.

### A. 가장 빠른 복구(데이터는 두고 화면만 되돌리기) — 코드 한 줄
`src/lib/features.ts`의 `ENABLE_PUBLIC_DEMO_SPACES = false`로 바꾸고 배포한다.
- 효과: 시연용 가상 공간 11곳과 시연 콘텐츠가 일반 방문자에게 안 보인다(DB 행은 남음 — 관리자에게도 `isDemo` 공간은 기존 정책대로). 지역 선택은 다시 모든 지역이 열린 기존 방식, 기본 지역 망원도 해제된다. 저장 · 방문 기록 데이터는 그대로 남고, 시연 공간 기록은 내 공간에서 숨겨진다.
- 다시 켜면 즉시 복원된다.

### B. 가상 공간 11곳을 DB에서 제거(완전 복구)
영향: `SavedEditorialSpace` · `ProfileSpace` · `HomeShelfSpace` · `DiscoveryEvent`는 공간 삭제 시 함께 삭제(cascade)된다. `ArchiveEntry`는 `spaceId`가 비워져(SetNull) **개인 기록으로 남는다**(`placeName` 유지) — 사용자 기록이 사라지지는 않지만 공개 공간과의 연결은 끊긴다.
1. (선택) 영향 확인: `SELECT count(*) FROM saved_editorial_spaces s JOIN editorial_spaces e ON e.id=s."spaceId" WHERE e.slug LIKE 'demo-%';` 와 `archive_entries`에서 같은 조건.
2. 삭제(관리자 승인 후): `DELETE FROM editorial_spaces WHERE "isDemo" = true AND slug LIKE 'demo-%' AND "cubeAvailable" = false;` — slug 접두어와 `isDemo`를 **둘 다** 조건으로 건다(`proto-*` 프로토타입은 건드리지 않는다).
3. 대안(삭제 없이 숨기기): `UPDATE editorial_spaces SET status='ARCHIVED' WHERE "isDemo" = true AND slug LIKE 'demo-%';` — 화면에서 사라지고 사용자 기록은 유지된다.
4. 코드 쪽은 §D로 fixture 방식으로 돌아가거나, §A로 시연 콘텐츠를 끈다(시연 콘텐츠는 11곳이 DB에 모두 있을 때만 나온다).

### C. Partner 태그를 변경 전(빈 배열)으로
영향: HOME 테마 선반 · 검색 · 추천의 태그 기반 노출이 줄어든다(변경 전 상태).
`UPDATE editorial_spaces SET tags = '{}' WHERE slug IN ('nokhwabutton','dasijeom','booknook-yeonnam','aka-coffee-room','turndown-service','inner-discovery') AND "isDemo" = false;`
(관리자 `/admin/content/spaces/[id]`에서 공간별로 태그를 지워도 같다. 위 §2-2 표가 변경 후 값이다.)

### D. 코드 되돌리기
- 이 작업의 커밋을 `git revert <SHA>`(SHA는 `docs/CLAUDE_HANDOFF.md` 참고). 되돌리면 `fixtures.ts` 기반 구현으로 돌아가며, 이 경우 §B로 DB의 `demo-*` 행도 제거하거나 보관해 이중 노출을 막는다.
- 그 이전 상태(fixture 기반 공개)는 커밋 `68dc494`, 그 이전(망원 기본 지역 이전)은 `3d52683`.

### E. 복구 후 확인
- `/`와 `/spaces/aka-coffee-room`, `/spaces/booknook-yeonnam`의 지역 · 주소가 §2-1 표와 같은지.
- `/admin/content/spaces`에서 공개 공간 수 · 태그.
- Discovery KPI(`/admin/reports`) 수치가 복구 전후 같은지(시연 공간은 원래 집계 제외).

## 5. 재현 · 점검 명령

```bash
npx tsx --env-file=.env scripts/seed-demo-spaces.ts            # 미리보기(기본, DB 변경 없음)
npx tsx --env-file=.env scripts/seed-demo-spaces.ts --apply    # 적용(재실행 안전: 있으면 건너뜀, 태그는 빈 공간에만)
```
