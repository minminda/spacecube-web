# Claude Code Latest Handoff

Updated: 2026-10-11 (KPI를 공간 발견 / 방문 이후 두 영역으로 재구성 + Discovery 최소 계측)

## 이번 세션
1. **KPI 두 영역** — 공간별 `/admin/[id]/report`와 서비스 전체 `/admin/reports`(상단 "서비스 전체 흐름", 7일/30일/전체)에 `A. 공간 발견`(Detail View → Save → Map Click, 조회 대비 %, + Map Click→7일 내 QR 스캔) / `B. 공간 방문 이후`(기존 핵심 퍼널·방문·스토리·취향·방명록·방문 로그 전부 그대로)로 머리말만 나눔. 기존 지표 의미·값 무변경. 컴포넌트: `src/components/admin/kpi/DiscoveryKpi.tsx`.
2. **새 계측** — `DiscoveryEvent`(SPACE_VIEW / MAP_CLICK). `/spaces/[slug]` 진입 시 `DiscoveryTracker`, "지도에서 보기" 클릭 시 `MapLink`가 `POST /api/discovery-events`. fixture·isDemo·비발행 공간·관리자 로그인은 기록 안 함. 같은 방문자(userId 또는 sc_anon_id)·공간·종류 30분 안 중복은 쓰기 시점에 무시. 로그인 상태면 userId+anonId 둘 다 저장(QR 스캔과 어느 쪽으로든 연결).
3. **재사용** — Save = `SavedEditorialSpace`(+운영 `SavedSpace`) createdAt 기준(저장 취소분은 남지 않음, 새 이벤트 없음). QR = 기존 `SpaceScan`. 공개 공간↔운영 공간은 slug로 연결(`src/lib/discoveryKpi.ts`).
4. **Map Click → 7일 내 동일 공간 QR** — 구현·KPI 포함. (방문자×공간) 단위, userId 또는 anonId 일치. 한계: 쿠키 12시간 유지라 비로그인은 하루 넘기면 연결 끊김, 클릭 후 7일 미경과분은 과소.
5. 집계 기준은 전부 "명"(visitorIdentity 재사용), 관리자·더미 계정 제외(`getKpiExcludedUserIds`).

## DB / schema
**추가형 변경만**: enum `DiscoveryEventType`, 테이블 `discovery_events`(EditorialSpace/User FK, 인덱스 2개). 기존 테이블 무변경. 운영 DB에는 다음 배포 빌드의 `prisma db push`로 생성됨 — **그 전에 로컬/운영 DB에서 관리자 KPI 화면을 열면 테이블 없음 오류**. 이 세션에서 운영 DB 쓰기 없음.

## Verification
- tsc · eslint(변경 파일) · vitest 전체(103 files / 979 tests, `discoveryKpi.test.ts` 신규: 전환 창·다른 공간·중복 클릭·userId/anonId 연결) 통과. `next build`·`db push` 미실행.
- **미검증**: 브라우저 렌더/클릭, 실제 DB 쓰기·집계(테이블 미생성 상태). 

## 다음 세션 후보
- 배포 후 `/spaces/<slug>` 방문·지도 클릭 → `/admin/reports`, 해당 공간 리포트에서 A 영역 숫자 확인.
- 트래픽이 쌓이면 노출(impression)·CTR 등 검토(이번엔 의도적으로 제외).
- 이전 후보: 최대 2회 HOME 중복 구조 변경, 실제 공간 태그·지역 등록.
