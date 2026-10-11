# Claude Code Latest Handoff

Updated: 2026-10-11 (Discovery fixture 확장 · Space 상세 Partner Episode/저장 UX)

## 이번 세션

1. **Fixture 30곳**(`src/lib/home/fixtures.ts`) — 지역 5(후암 · 망원 · 연남 · 서촌 · 성수) × 유형 6(카페 · 서점 · 전시공간 · 편집숍 · 바 · 문화공간), 태그 3~5개(관리자 태그 정본 이름), 한 줄 소개 · 선정 이유 · 지도 링크 placeholder 여부 · Partner 5곳. 이름은 "임시 · …", slug는 `fixture-N`, 사진 없음.
   - 노출: 관리자 · `NODE_ENV=development`에서만. HOME `/?preview=fixtures`, 검색 `/search?preview=fixtures`(+ `/api/search?preview=fixtures`), 상세 `/spaces/fixture-N`(DB 조회 없음, `findFixtureSpace`). 일반 방문자는 파라미터를 붙여도 무시/404. 운영 DB INSERT 없음.
   - 지역 선택은 `homeHref({area, preview})`로 preview가 유지된다. fixture 카드/상세 저장은 `SaveButton mock`(서버 요청 없이 화면에서만 토글).
   - HOME 첫 선반의 fixture 6곳은 지역을 돌아가며 뽑는다(전엔 후암만 몰렸음).
2. **Partner EP.1**(`PartnerEpisodeList`, 신규 client) — 제목은 보이고, QR 전 클릭하면 `<dialog>` 안내("이 이야기는 공간에서 열 수 있어요. / 공간을 방문해 공간큐브의 QR을 인식해보세요."). 잠금 아이콘은 기존 `LockIcon`(벡터). QR 후(`getPartnerEpisodes`의 `unlocked`)엔 기존 `/space/[slug]/episodes/[id]` 링크. 판정 로직(`resolveSpaceAccess`/`computeEpisodeState`) 무변경.
3. **직접 Episode URL** — 변경 없음, 이미 안전: `/space/[slug]/episodes/[id]`가 `resolveSpaceAccess` 실패 시 `SpaceLockNotice`(본문 미렌더, 돌아가기 링크 `/space/[slug]`).
4. **공개 상세의 "방명록 열기" 제거**(`/spaces/[slug]`). `/space/[slug]/record|guestbook` 라우트 · 현장 흐름은 그대로. "이 공간에서 QR을 스캔하면…" 보조 문장도 다이얼로그로 대체되어 삭제. 방명록 흔적 수(`traces`)는 유지.
5. **저장 UX** — 상세의 "저장하기" 텍스트 버튼 → 헤더 우측 상단 북마크 아이콘(`SaveButton variant="detail"`, 22px, 저장됨=filled). 기존 `/api/saves/spaces/[id]`·로그인 복귀 정책 그대로. `variant="text"`는 `/u/[handle]/s/[slug]`가 계속 사용.

## DB / schema
변경 없음. 운영 DB 쓰기 없음.

## Verification
- tsc · eslint(변경 파일) · vitest 전체(101 files / 969 tests) 통과. `next build` 미실행(prisma db push 포함).
- dev 서버(다른 세션의 3000)로 확인: HOME fixture 선반(전 지역 · 테마) · 망원 지역 화면(16곳, 카페/테마 선반) · 검색 6종(LP 책 조용한 망원 "망원 LP" 혼자 — 관련도 순 정상, 플래그 없으면 fixture 0건) · fixture 상세(일반: Episode/QR/방명록 없음, Partner: EP.1 → 다이얼로그 열림/닫힘, 저장 토글, 방명록 버튼 없음).
- **미검증**: 브라우저 pane이 숨김이라 실제 공간(북눅 연남 등)의 클라이언트 클릭(다이얼로그 · 저장)은 하이드레이션 안 돼 못 눌러봄 — 서버 렌더(EP.1 버튼 존재, 에피소드 링크 · 방명록 버튼 없음)만 확인. QR Unlock 후 이동은 코드 경로가 기존 그대로라 따로 실행하지 못함. 스크린샷 불가.

## HOME 밀도 관찰 (미조정, 결정 필요)
- fixture 포함 HOME(1280): 카드 149칸 / 고유 58곳, 같은 공간 최대 4번 반복. 원인은 구조: "새롭게 소개한 공간"과 지역 선반이 같은 최신 공간을 공유, 테마 선반 9개가 같은 공간을 태그별로 중복.
- 후보(구조 변경이라 이번엔 안 함): 지역 선반에서 "새롭게 소개" 공간 제외 / 테마 선반 노출 상한(예: 6개).
- 테마 선반은 `HOME_THEMES` 9개가 상한(영화는 fixture에 없어 8개 노출).

## 다음 세션 후보
- 위 반복 완화 여부 결정, 실제 공간 태그 · 지역 등록(이전 핸드오프 항목).
- 숨김 pane이 아닌 상태에서 실제 Partner 공간 EP.1 다이얼로그 · 저장 한 번 눈으로 확인.
