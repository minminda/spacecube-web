# SpaceCube AI Collaboration Workflow

이 문서는 ChatGPT와 Claude Code가 같은 프로젝트 기준을 공유하기 위한 운영 규칙이다.

## Source of truth priority

충돌이 있을 때 우선순위는 다음과 같다.

1. 현재 코드와 DB schema
2. `docs/PRODUCT_DECISIONS.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/CLAUDE_TASK.md`의 현재 작업 요구사항
5. 기존 날짜형 문서 및 실험 문서

기존 `docs/*-2026-10-03.md` 등의 문서는 중요한 역사 자료지만, 이후 방향이 바뀌었을 수 있다.

## Before coding

Claude Code는 작업 시작 전에 최소한 다음 파일을 읽는다.

- `CLAUDE.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_DECISIONS.md`
- `docs/CLAUDE_TASK.md`

작업이 DB, Archive, Recommendation, Cube, Editorial CMS와 관련되면 해당 기존 docs와 실제 schema/code도 함께 확인한다.

## During coding

- 현재 구현을 먼저 조사하고 중복 시스템을 만들지 않는다.
- 기존 컴포넌트/쿼리/정책을 재사용한다.
- 명시되지 않은 대규모 schema 변경, 데이터 삭제, feature flag 변경은 하지 않는다.
- 실제 사용자 데이터와 demo/sample/test 데이터를 섞지 않는다.
- UI 수정은 SpaceCube의 editorial, black/white, minimal 방향을 유지한다.

## After coding

작업 완료 후 `docs/CLAUDE_HANDOFF.md`를 최신 상태로 교체한다.

반드시 포함:

- 작업 날짜
- commit SHA
- 완료 항목
- 핵심 변경 파일
- DB/schema 변경 여부
- 테스트 결과
- 발견한 문제
- 사용자 결정이 필요한 항목

`CLAUDE_HANDOFF.md`는 누적 일지가 아니라 **가장 최근 구현 상태를 빠르게 파악하기 위한 최신 handoff**로 유지한다. 필요하면 Git history가 과거 기록을 담당한다.

## ChatGPT side

ChatGPT는 다음 작업을 제안하거나 검토할 때 GitHub의 최신 코드/commit과 `CLAUDE_HANDOFF.md`를 먼저 확인한다.

제품 방향이 바뀌면 `PRODUCT_DECISIONS.md`를 갱신하고, 구현할 작업은 `CLAUDE_TASK.md`에 적는다.

## Safety

- production 데이터 mass update/delete 금지
- 실제 사용자 기록을 demo/sample로 덮어쓰기 금지
- sample/demo가 KPI, 추천, public analytics에 섞이지 않게 유지
- private memo/photo/email/internal flags 등은 public API에서 노출하지 않는다
