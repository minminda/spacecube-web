# Claude Code Instructions for SpaceCube

This repository uses shared project-context files so Claude Code and ChatGPT can work from the same product decisions.

Before starting any implementation task, read in this order:

1. `docs/AI_WORKFLOW.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/CLAUDE_TASK.md`

Then inspect the actual code, Prisma schema, routes, tests, and relevant historical docs before changing implementation.

If older dated docs conflict with `docs/PRODUCT_DECISIONS.md`, treat the newer product decisions as the intended direction unless the current task or code/schema clearly supersedes them.

After completing a task:

- run the appropriate typecheck/tests/build/lint
- verify relevant desktop/mobile flows when UI changes
- commit and push
- replace `docs/CLAUDE_HANDOFF.md` with the latest implementation handoff

Do not silently introduce large schema changes, mass production-data mutations, new feature flags, or new product concepts not requested by the current task.

Preserve separation between real user data and demo/sample/test data.
