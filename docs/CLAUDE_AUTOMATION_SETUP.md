# Claude Code 자동 실행 연결

목표:

ChatGPT가 `docs/CLAUDE_TASK.md`를 GitHub에 업데이트하면 별도 복붙/터미널 입력 없이 Claude Code Routine이 자동으로 실행되게 한다.

## 구조

ChatGPT
→ GitHub `docs/CLAUDE_TASK.md` 변경
→ GitHub Actions `Dispatch Claude Task`
→ Claude Code Routine API
→ Claude Code cloud session
→ 구현 / 테스트 / handoff / commit 또는 PR

## 1. Claude Code Routine 생성

Claude 웹에서 Claude Code Routines 화면을 열고 새 Routine을 만든다.

Routine 이름 예시:

`SpaceCube Task Runner`

Repository:

`minminda/spacecube-web`

Routine prompt 권장문:

```text
You are the implementation agent for SpaceCube.

The triggering payload contains the current contents of docs/CLAUDE_TASK.md.
Before coding, read CLAUDE.md, docs/PROJECT_CONTEXT.md, docs/PRODUCT_DECISIONS.md, docs/AI_WORKFLOW.md, and docs/CLAUDE_TASK.md from the repository.

Treat docs/CLAUDE_TASK.md as the current implementation request. Inspect the existing code first and implement the task with the smallest safe change. Preserve existing product decisions and privacy/demo/canonical-space policies unless the task explicitly changes them.

Run the verification requested in the task. Update docs/CLAUDE_HANDOFF.md with:
- completed work
- root cause when relevant
- changed files
- tests/build results
- remaining blockers or decisions
- commit/PR reference

Do not rewrite docs/CLAUDE_TASK.md.
Do not perform production data mass deletion, destructive migrations, force push, or secret changes.

Finish the implementation in the connected repository and publish the code change according to the repository permissions configured for this Routine.
```

## 2. API Trigger 추가

Routine 편집 화면에서 API trigger를 추가한다.

생성 후 다음 두 값을 받는다.

- Routine fire URL
- Routine bearer token

토큰은 다시 표시되지 않을 수 있으므로 복사 즉시 GitHub secret으로 등록한다.

## 3. GitHub Actions Secrets 등록

GitHub repository:

`Settings → Secrets and variables → Actions → New repository secret`

두 개 추가:

### `CLAUDE_ROUTINE_URL`
Routine API trigger의 `/fire` URL 전체.

### `CLAUDE_ROUTINE_TOKEN`
Routine에서 생성한 bearer token.

토큰을 repo 파일, `.env.example`, issue, commit에 직접 적지 않는다.

## 4. Branch 권한 선택

### 권장: 자동 작업 + PR 검토

Routine 기본 branch 정책을 유지하면 Claude가 `claude/` branch에서 변경하고 리뷰 가능한 형태로 남길 수 있다.

### 완전 무인 master 반영

정말 필요할 때만 Routine repository permissions에서 기존 branch push 권한을 허용한다.

직접 master push는 잘못된 구현도 즉시 반영될 수 있으므로 현재는 PR 검토 방식을 권장한다.

## 5. 자동 실행 조건

`.github/workflows/claude-task-dispatch.yml`은 다음 조건에서 실행된다.

- `master` branch에 push
- 변경 파일에 `docs/CLAUDE_TASK.md`가 포함됨

`CLAUDE_HANDOFF.md` 수정이나 일반 코드 push는 다시 Claude를 실행시키지 않는다.

따라서 loop가 발생하지 않는다.

## 6. 테스트

Secret 설정 후 `docs/CLAUDE_TASK.md`에 작은 테스트 작업을 한 번 반영한다.

확인 순서:

1. GitHub Actions → `Dispatch Claude Task` 성공
2. Claude Code Routines → 새 실행 생성
3. Routine session이 `spacecube-web` repo를 읽음
4. 실제 작업 branch/commit 또는 PR 생성
5. `docs/CLAUDE_HANDOFF.md` 갱신

## 7. 실패 시

### GitHub Action에서 secret missing

`CLAUDE_ROUTINE_URL`, `CLAUDE_ROUTINE_TOKEN` 등록 확인.

### 401

Routine token이 틀렸거나 재발급됨. 새 token으로 GitHub Secret 교체.

### Routine은 시작하지만 repo를 못 읽음

Routine의 GitHub 연결/저장소 권한 확인.

### 작업은 했지만 master에 반영 안 됨

기본 branch 권한에서는 Claude branch/PR로 남는 것이 정상일 수 있다. Routine branch permission을 확인한다.

## 운영 원칙

앞으로 ChatGPT가 다음 작업을 넘길 때는 `docs/CLAUDE_TASK.md`만 변경한다.

그 변경 자체가 Claude Code 실행 신호가 된다.
