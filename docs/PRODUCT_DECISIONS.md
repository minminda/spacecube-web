# SpaceCube Product Decisions

Updated: 2026-10-05

This file is the current product-direction source of truth. If an older dated planning document conflicts with this file, follow this file unless current code/schema or a newer explicit user decision supersedes it.

## Product tone

- 기능은 플랫폼이지만 보이는 인상은 공간 매거진에 가깝게 유지한다.
- 과도한 dashboard/SNS 느낌을 피한다.
- black/white, typography, whitespace 중심.
- 사용자에게 취향 점수/매칭 퍼센트/통계 그래프를 과하게 노출하지 않는다.

## Editorial taxonomy

Keep only:
- STORY > PEOPLE
- STORY > THOUGHT
- CURATION

Do not reintroduce SPACE/RECORD taxonomy unless explicitly decided later.

Homepage STORY separates PEOPLE and THOUGHT vertically instead of mixing them in one grid.

Dedicated sections should avoid redundant type labels:
- CURATION section card: number/area is enough
- PEOPLE section card: number is enough
- THOUGHT section card: number is enough
- LATEST can include type because content types are mixed

## Reading progress

PEOPLE, THOUGHT, CURATION long-form pages use a continuous top progress bar.
Current visual target: about 4px, black, same language on desktop/mobile.
Article end should reach 100%; footer/related content should not be required.

Cube QR story should use the same continuous progress language rather than the previous five separated progress cells.

## Recommendation IA

`/find` has two tabs:
- 공간 (default)
- 사람

### Space tab

Space tab is only about spaces.
Do not show:
- taste-matched curators
- recommended people
- people profile blocks
- curator modules

Current controls:
- area dropdown
- space name search
- category dropdown using existing stored category/type data
- existing personalized ranking within filtered candidates

Area UX:
- `전체` + `지역` dropdown
- choosing 연남/망원/서촌/etc changes the dropdown label to the chosen area
- choosing `전체` clears area filter

Category UX:
- category dropdown sits next to space search
- values come from existing database/category definitions rather than a duplicated hardcoded taxonomy

### People tab

People tab combines recommendation and search in one screen.
Do not require a separate People Search flow as the main path.

Search supports:
- `@handle`
- handle without `@`
- nickname

Placeholder:
- `@아이디 또는 닉네임 검색`

Default section language:
- `내 취향과 가까운 사람들`

People cards should show, where layout permits:
- vector/profile avatar
- nickname
- `@handle`
- `따라가는 취향 N`
- `나를 따라가는 사람 N`

Mobile remains a 4-column people grid. Keep metadata compact enough not to break the grid.

## No separate curator model

Do not introduce:
- CuratorProfile
- official curator role
- curator badge/tier
- curator-only admin model

All normal users can function as taste references through the spaces they choose.

## Archive actions

Archive top actions (the page is now called 내 공간 in UI):
1. `공간 추가` — primary
2. `내 공간 공유` — secondary

Remove `사람 찾기` from Archive because people discovery lives in 추천 > 사람.

Settings should not be a gear icon scattered across Archive/Profile.
Settings belongs in the menu under 사용자 (next to 내 공간) and as a row at the bottom of 내 공간.

## Archive sharing

`내 공간 공유` should immediately copy the current user's canonical public-profile URL to clipboard.
No share-sheet/modal is required for this action.

Success feedback:
- `링크를 복사했어요.`

Never share an internal DB id/UUID.

## Public profile privacy

New profiles default to public.
Users can switch to private in Settings.

Public:
- public archive content should render for visitors, including unauthenticated visitors, according to privacy rules

Private:
- direct profile URL still resolves
- show a private archive state such as `비공개 아카이브입니다.`
- do not expose archive/private content

Sharing remains possible even when private; the recipient simply sees the private state.

People recommendation/search discovery should include public profiles only.

Do not blindly mass-change existing users if the system cannot distinguish an explicit private choice from a legacy default-private state.

## Recommendation signals

V1 should not ask users to rate every visited space with stars/scores.
Use behavior strength instead.
Conceptual direction:
- visited = strong signal
- repeat visit = stronger signal
- want-to-go/save = weaker signal

Do not expose raw internal scoring to users.
If later evidence shows that visits alone create poor recommendations, consider a lightweight explicit taste signal then.

## Canonical Space vs personal direct registration

Canonical Space:
- shared place data
- searchable/recommendable

Personal direct registration:
- fallback for the individual user
- private/personal by default
- not exposed in other users' canonical search
- not used as canonical recommendation data

The Space Add first screen should keep both canonical search and direct registration accessible.

## Mobile density

- Space grid: 4 columns on mobile
- People recommendation grid: 4 columns on mobile
- STORY/CURATION cards: 3 columns on mobile

Do not casually revert these densities without an explicit decision.

## Top-level structure (2026-10-11): HOME · 검색 · 내 공간

The user-facing top level is exactly three things:
- **HOME** — SpaceCube shows spaces to the user (discovery hub with shelves).
- **검색** (`/search`) — the user searches regions/spaces/taste directly.
- **내 공간** (route stays `/archive`) — saved / visited / recorded spaces accumulate here. Formerly "내 아카이브"; the old wording is retired in UI (routes, variables, DB models are not renamed).

`추천` is no longer a top-level destination. Recommendation is the principle that personalizes HOME:
- `회원님을 위해 엄선한 공간` (existing ranking), `관심 지역에서 발견한 공간`, `나와 비슷한 사람들이 좋아한 공간`, small `취향이 비슷한 사람` row.
- People are a *reason to discover spaces*, not a social feed. HOME shows spaces first; the people row is avatar + nickname only (no counts/follow).
- `/find` (공간 탭 + 사람 탭, now titled "탐색") and `/recommend` → `/find` redirect are kept for compatibility but are not in navigation. People search / `@handle` / follow still live at `/find?tab=people`.
- `/recommendation` (legacy "추천 방식" explainer) is kept, unlinked.

### Navigation
- Header (desktop and mobile): logo + hamburger. Desktop also has a search icon. Desktop header is taller (68px, `--nav-h`); mobile stays 56px.
- Hamburger menu (same content desktop/mobile; desktop = right panel, mobile = full screen):
  - 콘텐츠: CURATION, STORY
  - 탐색: 지역 둘러보기 (`/search#regions`), 테마 둘러보기 (`/search#themes`)
  - 사용자: 내 공간, 설정
  - 로그인 (logged out) / 로그아웃 (logged in)
  - Secondary: 공간큐브, 공간큐브 소개, 공간 제안하기, Instagram, Contact, 관리자 (admin only)
- Mobile bottom tab bar (md and below): 홈 · 검색 · 내 공간, vector icons (no emoji), safe-area aware. Not shown on Cube/QR (`/space/…`, `/c/…`), login, admin, operator.
- 설정 is reachable logged out too (theme is a device setting); account sections need login.

### Search
- Corpus per space: name, region (normalized), category, tags, one-liner, description, curation titles/summaries, curation selection reasons. Ranking is a pure, explainable score (`src/lib/search/spaceSearch.ts`): name exact > name prefix/word > region exact > category exact > tag exact > theme > name partial > … > description. Multi-word queries sum per-word scores (no hard AND). `연남동` = `연남`.
- Landing (no query): 추천 지역 + 추천 테마. No separate search infrastructure.

### Saved regions (관심 지역)
- Star (vector, filled when saved) in region picker, search region results, region HOME heading, 내 공간.
- Logged in: `SavedRegion` table (additive). Logged out: cookie `sc_regions` (no merge on login).
- HOME puts one combined "관심 지역에서 발견한 공간" shelf ahead of generic region shelves; saved regions are removed from generic area shelves.

### Theme
- 라이트 / 다크 in Settings, stored per device (`localStorage` key `sc-theme`, applied before first paint). Dark = charcoal tokens scoped to editorial surfaces and header/tab/footer chrome; Cube/QR on-site screens stay light.

## Sample/demo data

Demo/sample content must be clearly separable from real user activity.
It must not inflate:
- KPI
- funnel conversion
- recommendation signals
- reports
- real public participation metrics

Do not create fake engagement (reactions, comments, visits, funnel events) or count dummy content as real visitor activity.

### Guestbook sample notes (2026-10-06)

Exception decided by the owner: guestbook sample notes may be shown to regular visitors so a space's guestbook does not look empty.

- Visible on the visitor guestbook canvas and past guestbooks together with real notes, with no "샘플 / SAMPLE / 더미" marker; the author shows as "익명의 방문자".
- Internally always identifiable: written by one dedicated `User.isDemo` account (`sample-guestbook@spacecube.local`). Only the admin guestbook list marks them SAMPLE.
- Excluded from KPI, funnel, monthly reports (including reactions on sample notes), recommendation signals, rewards, operator screens/counts and public profiles.
- Seeded automatically on Vercel production deploys only (`postbuild` → `scripts/seed-sample-guestbook.ts --apply`), for currently operating spaces (`isActive && !isDemo` + ACTIVE guestbook session), answering the session's current questions only, about 12 per space, idempotent. A seed failure never fails the deploy.
- Real user notes, reactions, comments and visit records are never modified or deleted by the seed.
