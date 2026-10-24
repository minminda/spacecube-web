# 시연 컬렉션 확장 공간 9곳 — 출처 · 영향 · 복구 (2026-10-24)

## 무엇을 했나

HOME이 17곳만 반복해 보여 주던 문제(UX 감사: 카드 63장 · 고유 17곳)를 줄이기 위해, **이미 운영 DB에 있던 비활성 망원 공간(운영 Space, `isDemo=true`, `isActive=false`) 9곳**을 EditorialSpace(공개 상세) 행으로 더했다.
새 사진 업로드 · 소개문 작성은 하지 않았다. 이름 · 주소 · 운영시간 · 지도 링크 · 한 줄 소개 · 소개문 · 대표 사진(Cloudinary 기존 URL)은 운영 Space 값을 그대로 복사했다.

| 새 slug | 이름 | 원본 운영 Space | 유형 | 지역(주소 기준) | 태그 |
|---|---|---|---|---|---|
| `demo-ext-tail-tango` | 테일탱고 | `tail-tango` | 독립서점 | 망원동 | 책, 영감 있는, 독특한, 대화 |
| `demo-ext-silo-store` | 사일로 상점 | `silo-store` | 소품샵 | 망원동 | 소품, 독특한, 감각 있는, 영감 있는 |
| `demo-ext-terrific-jam` | 테라픽 잼 | `terrific_jam` | 소품샵 | 망원동 | LP, 음악, 패션, 감각 있는 |
| `demo-ext-gori` | 고리 | `cafe-gori` | 문화 카페 | 망원동 | 음악, 책, 편안한, 따뜻한 |
| `demo-ext-sido-place` | 시도플레이스 | `siiiidoplace` | 복합문화공간 | 연희동(주소: 서대문구 연희맛로) | 대화, 독특한, 감각 있는 |
| `demo-ext-denmark-library` | 덴마크 서재 | `denmark-library` | 독립서점 | 망원동 | 책, 편안한, 집중되는, 혼자 |
| `demo-ext-cut-the-cake` | 컷더케이크 | `cutthekake_` | 전시공간 | 망원동 | 전시, 영감 있는, 독특한, 편안한 |
| `demo-ext-goose-coffee-bar` | 구스커피앤바 | `goose-coffee-and-bar` | 복합문화공간 | 망원동 | 음악, 책, 저녁, 따뜻한 |
| `demo-ext-brown-front-door` | 브라운 프론트 도어 | `brown-front-door` | 문화 카페 | 망원동 | 커피, 음악, 감각 있는, 편안한 |

- 사진: 위 9곳의 사진은 전부 HOME에 한 번도 쓰이지 않은 기존 Cloudinary 이미지다(서점 서가 · 빈티지 상점 외관 · 레코드 · 창가 카페 · 콘크리트 전시 공간 · 흰 갤러리 · 턴테이블 · 라운지 · 공유 서재). 가로 폭 458~1280px.
- 제외한 후보: **별관**(사진에 제3자 워터마크 "Kaden's Note"), **뮤직컴플렉스**(주소가 종로 인사동), **라이팅룸**(중구, 소개문이 인사말뿐), 중복 행(`다시점 `, `카페 공간`=buk 시연 공간).
- 소개문이 "안녕하세요 …입니다" 같은 인사말뿐인 시도플레이스는 소개문을 비웠다(상세에는 "공간 소개를 준비하고 있어요" 문구).
- 태그 근거는 운영 Space의 소개문 · 한 줄 소개에 적힌 것과 사진에서 보이는 것뿐이다. 관리자 태그 정본 이름만 썼다(스크립트가 정본 불일치 시 중단).

## 출처 표시 · 구분

- 확장 공간은 `EditorialSpace.isDemo=true` + slug 접두어 **`demo-ext-`**. "가상 공간(`demo-` 접두어, 실제 장소가 아님)"과 구분된다.
- 공개 경로는 기존 시연 공간과 같다(`src/lib/demoSpaces.ts`: `isPublicDemoSpace`는 `demo-`로 시작하면 true) → HOME · 검색 · 상세 · 저장 · 내 공간 · 추천 후보에서 동작, **KPI는 `isDemo=false`만 세므로 자동 제외**.
- 화면 문구: 카드 **"시연 컬렉션"**(가상 공간은 "시연용 공간"), 상세 상단에 "시연 컬렉션 — 망원 시연을 위해 등록한 실제 장소의 일반 공간이에요. 공간큐브 QR · Episode는 아직 없고, 등록된 정보만 보여 드려요." (`demoBadge`, `isExtendedSpace`)
- Partner가 아니다: `cubeAvailable=false`, QR · Episode · Scene · 방명록 없음, 운영 Space는 **비활성 그대로**(변경 없음). Partner 6곳(QR / Episode / Guestbook)은 변경하지 않았다.
- 지역: DB 지역 · 주소는 실제 그대로. "망원 컬렉션" 소속은 기존 시연 지역 모드(`ENABLE_PUBLIC_DEMO_SPACES`)가 정한다.

## 운영 DB 변경

- **추가만** — EditorialSpace 새 행 9개(`scripts/seed-extended-spaces.ts --apply`). 기존 행 · 운영 Space · 사용자 데이터는 수정하지 않았다. 같은 slug가 있으면 건너뛰므로 재실행해도 같은 결과.
- 스키마 변경 없음.

## 되돌리기

```bash
# 1단계(권장) — 공개에서 사라지고 데이터는 남음. status=PUBLISHED로 되돌리면 복원
npx tsx --env-file=.env scripts/seed-extended-spaces.ts --archive
# 2단계 — 저장 · 기록 · 연결이 하나도 없는 행만 삭제(참조가 있으면 건너뜀)
npx tsx --env-file=.env scripts/seed-extended-spaces.ts --delete
```

사용자가 이 공간을 저장하거나 "다녀왔어요"로 기록했다면 그 기록은 해당 EditorialSpace를 가리킨다. 그래서 `--delete`는 참조가 있는 행을 지우지 않고, `--archive`로 숨기는 것을 기본 복구 수단으로 한다.
`ENABLE_PUBLIC_DEMO_SPACES=false`로 끄면 가상 공간 · 확장 공간이 모두 닫힌다(기존 정책).

## 같은 날 함께 바뀐 코드(요약)

- 내 공간: 탭을 **다녀왔어요 · 저장 · 전체**로, 기본 보기는 다녀왔어요(없으면 저장). 상단 요약에서 다녀왔어요를 크게. 전체 보기는 다녀온 공간이 저장한 공간보다 앞. 카드 메타에 "다녀왔어요 / N번 다녀왔어요 / 저장". 카드는 공개 상세가 있는 공간이면 `/spaces/[slug]`(데스크톱 상세 창), 개인 기록 · 상세 없는 공간만 내 기록 상세.
- 추천: 다녀왔어요(아카이브) 무게 3 → 4, 저장 무게 2/2.5 → 1.5. 같은 공간이 저장 + 다녀왔어요면 다녀왔어요 하나만 센다(기존 동작).
- HOME: 한 공간은 최대 2회(`diversifyShelves` hardCap) · 남는 카드가 4장 미만인 선반은 숨김 · 서비스 한 줄 정의 + `/about` 링크.
- `SaveButton` / `SpaceRelation`의 `mock`(화면에서만 바뀌는 저장) 분기 제거.
