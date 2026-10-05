# SpaceCube Current Project Context

Updated: 2026-10-05

## Product definition

SpaceCube is evolving from a QR-based on-site story/guestbook experience into a broader space taste, editorial content, archive, and recommendation platform.

Core problem:
- Users often know the kind of place they want, but spend too long filtering map/SNS results.
- The product premise is not that space information is missing, but that information is insufficiently filtered for the individual.

Core value:
- Help users discover spaces that fit their taste/history more quickly.
- Preserve a calm editorial/magazine-like feel rather than a dashboard or heavy social-network feel.

## Public information architecture

Primary navigation:
- 큐레이션
- 스토리
- 추천
- 내 아카이브

Mobile header:
- Logo + menu only

Mobile drawer primary:
- 큐레이션
- 스토리
- 추천
- 내 아카이브

Then separated:
- 설정

Secondary:
- 공간큐브
- 소개
- 공간 제안하기
- Instagram
- Contact
- 관리자 (admin only)

## Editorial content

STORY has two content types:
- PEOPLE: a person/operator story, interview, philosophy
- THOUGHT: reflection or observation about spaces

CURATION:
- multiple spaces connected by a viewpoint, region, situation, or purpose

Long-form PEOPLE / THOUGHT / CURATION pages use a top reading progress bar.

Homepage direction:
- LATEST
- CURATION
- STORY
  - PEOPLE
  - THOUGHT
- 함께한 공간

Visual tone:
- editorial
- black/white
- strong typography and whitespace
- minimal labels
- no unnecessary badges, analytics cards, or decorative UI

## Recommendation

Route: `/find`

Two tabs:
- 공간 (default)
- 사람

### 공간
Focus only on spaces. Do not mix people/curator modules into this tab.

Current intended controls:
- area selector
- space search
- category selector based on existing stored Space category/type values
- personalized ranking remains the underlying order

Mobile space cards: 4 columns.

### 사람
Purpose: discover users whose selected spaces are close to the current user's taste.

Contains:
- search by `@handle` or nickname
- recommended people
- public profile links
- follow/taste-following relationship

Mobile people cards: 4 columns.

No separate curator entity, curator role, curator badge, or official curator tier.

## Archive

Archive = the user's relationship and experience with canonical Space data.

Canonical Space stores shared place information.
User/archive stores relationship such as:
- WANT_TO_GO
- VISITED
- visit date
- personal photo
- memo
- repeat visits

Directly registered personal spaces remain private/personal and should not leak into canonical public search or recommendation.

Archive top actions should focus on:
- 공간 추가
- 내 아카이브 공유

People discovery belongs under 추천 > 사람, not Archive.

## Public profile

Public profile uses a public handle such as `@unq66c6i`.

Default for newly created profiles: public.
Users can switch to private in Settings.

If public:
- public archive content should actually render for unauthenticated visitors according to privacy rules

If private:
- the public URL still resolves
- show a simple private archive state
- do not expose archive/private data

Archive share action copies the public profile URL directly to clipboard regardless of public/private state.

## Cube / QR

Original SpaceCube experience remains for participating physical spaces:
- QR entry
- space/operator story
- guestbook
- archive/record

Cube story progress UI should use the same continuous reading-progress language as STORY/CURATION instead of the old five-segment indicator.

Cube unlock/revisit logic must not be changed merely for UI progress changes.

## Technology

Current known stack:
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma
- Neon Postgres
- Vercel

Always verify actual package/schema/code before making implementation assumptions.
