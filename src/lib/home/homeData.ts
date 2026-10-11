/* ── HOME 발견 허브 데이터(서버 전용) ───────────────────────────────────────────
   새 추천 알고리즘 · 새 스키마 없이 기존 데이터를 조합한다.
   - 공간 Pool · 개인화 정렬 · 추천 이유: 추천 > 공간(/find)과 같은 getFinderPool → getFinderViewer → rankCandidates → cardReason
   - 선정 이유: 발행된 큐레이션에 적힌 공간별 선정 이유(EditorialCurationSpace.note)
   - 찜한 공간 · 다녀온 공간: 추천이 이미 쓰는 저장 · 방문 신호
   - 지역 · 테마 선반: 공간의 area · category · tags(src/lib/home/shelves.ts)
   - 관심 지역(별표): 로그인은 SavedRegion, 비로그인은 쿠키 — 있으면 일반 지역 선반보다 먼저 "관심 지역에서 발견한 공간" 하나로 합친다
   - 사람 추천: 사람 자체가 아니라 "나와 취향이 비슷한 사람들이 고른 공간"을 선반으로(rankPeople 규칙 그대로, 이유 있는 사람만)
   임시 공간(fixtures)은 관리자 · 로컬의 /?preview=fixtures에서만 섞는다. ── */

import { listAreas, listContentStream, listCubeSpaces, listCurations, listStoryItems } from "@/lib/editorial/queries";
import { normalizeArea } from "@/lib/editorial/area";
import { spaceCoverImage, type ContentItem, type CurationView, type SpaceView, type StoryItem } from "@/lib/editorial/types";
import { curatorAccess } from "@/lib/curators/access";
import { getFinderPool, getFinderViewer, type FinderSpace } from "@/lib/finder/finderData";
import { cardReason, rankCandidates } from "@/lib/finder/spaceFinder";
import { previewDemoUsers } from "@/lib/demoData";
import {
  buildAreaOptions,
  buildAreaShelves,
  buildCategoryShelves,
  buildThemeShelves,
  homeHref,
  newestFirst,
  spacesInArea,
  type AreaOption,
  type AreaShelf,
  type HomeSpace,
  type ThemeShelf,
} from "./shelves";
import { similarPeopleForHome, type SimilarPerson } from "@/lib/people/peopleData";
import { fixtureAreaCounts, fixtureSpaces } from "./fixtures";

const LATEST_COUNT = 5;
const PER_SHELF = 12;

export interface HomeCard {
  space: HomeSpace;
  reason: string | null;
}

export interface HomeSpaceShelf {
  key: string;
  title: string;
  description?: string;
  href?: string;
  cta?: string;
  cards: HomeCard[];
}

export interface HomeData {
  latest: ContentItem[];
  areaOptions: AreaOption[];
  /** 고른 지역(정규화) — 없으면 전체 */
  area: string | null;
  /** 고른 지역에 공간이 하나도 없을 때 */
  areaEmpty: boolean;
  areaCounts: { spaces: number; curations: number } | null;
  /** 개인화(또는 편집) 선반 — 맨 위 */
  forYou: HomeSpaceShelf | null;
  personalized: boolean;
  /** 관심 지역(별표)에서 아직 안 가본 공간 — 지역을 고르지 않은 HOME에서만 */
  interest: HomeSpaceShelf | null;
  /** 나와 취향이 비슷한 사람들이 고른 공간 — 로그인 + 취향 데이터 + 공개 프로필이 있을 때만 */
  similar: HomeSpaceShelf | null;
  /** 취향이 비슷한 사람(이름 · 아바타만) */
  similarPeople: SimilarPerson[];
  /** 저장한 관심 지역(최근 순) */
  savedRegions: string[];
  saved: HomeSpaceShelf | null;
  revisit: HomeSpaceShelf | null;
  /** 지역 · 새로 소개 · 유형 · 테마 선반(순서대로) */
  spaceShelves: HomeSpaceShelf[];
  /** 테마 칩(선반이 실제로 있는 테마만) */
  themeChips: { key: string; label: string }[];
  curations: CurationView[];
  stories: StoryItem[];
  cubeSpaces: HomeSpaceShelf | null;
  savedIds: Set<string>;
  loggedIn: boolean;
}

/** 공간 Pool의 공간 → HOME 카드 모양(검색 결과도 같은 카드를 쓴다) */
export function homeSpaceFromFinder(f: FinderSpace): HomeSpace {
  return {
    id: f.id,
    slug: f.view.slug,
    name: f.name,
    area: normalizeArea(f.area),
    category: f.category ?? "",
    tags: f.tags ?? [],
    summary: f.view.summary,
    image: spaceCoverImage(f.view),
    partner: f.view.cubeAvailable,
    order: f.order,
  };
}

function fromView(v: SpaceView, order: number): HomeSpace {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    area: normalizeArea(v.area),
    category: v.category ?? "",
    tags: v.tags ?? [],
    summary: v.summary,
    image: spaceCoverImage(v),
    partner: v.cubeAvailable,
    order,
  };
}

export async function getHomeData(opts: { userId: string | null; admin: boolean; previewDrafts: boolean; fixtures: boolean; area: string | null; savedRegions?: string[] }): Promise<HomeData> {
  const v = { preview: opts.previewDrafts };
  const access = curatorAccess({ admin: opts.admin, editorial: true });
  const savedRegions = opts.savedRegions ?? [];
  const [stream, stories, curations, cubeViews, areas, pool, me, similarRaw] = await Promise.all([
    listContentStream(v),
    listStoryItems(v),
    listCurations(v),
    listCubeSpaces(v),
    listAreas(v),
    getFinderPool(access),
    getFinderViewer(opts.userId, access),
    // 지역을 고른 화면에서는 쓰지 않는다 — 계산하지 않는다(관리자 · 로컬 개발은 더미 계정도 섞인 미리보기)
    opts.area ? Promise.resolve({ people: [] as SimilarPerson[], spaces: [] as { slug: string; visited: boolean }[] }) : similarPeopleForHome(opts.userId, { includeDemo: previewDemoUsers(opts.admin) }),
  ]);
  const visible = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status !== "ARCHIVED");

  // 공간 → 큐레이션에 적힌 선정 이유(가장 최근 큐레이션 것 하나)
  const notes = new Map<string, string>();
  for (const c of visible(curations)) for (const l of c.spaces) if (l.note && !notes.has(l.space.id)) notes.set(l.space.id, l.note);
  const reasonOf = (s: HomeSpace) => notes.get(s.id) ?? s.summary ?? null;

  const real = pool.map(homeSpaceFromFinder);
  const fixtures = opts.fixtures ? fixtureSpaces(real.length + 1) : [];
  const all = [...real, ...fixtures];

  const areaOptions = buildAreaOptions(mergeAreaCounts(areas, opts.fixtures ? fixtureAreaCounts() : []));
  const area = normalizeArea(opts.area);
  const inArea = area ? spacesInArea(all, area) : all;
  const areaRow = area ? areaOptions.find((o) => o.area === area) : null;

  const cardsOf = (list: HomeSpace[], reason: (s: HomeSpace) => string | null = reasonOf): HomeCard[] =>
    list.slice(0, PER_SHELF).map((space) => ({ space, reason: reason(space) }));

  // ── 개인화(또는 편집) 선반: 이미 다녀왔거나 찜한 곳은 빼고 "새로 발견할" 공간만 — 기존 추천 정렬 그대로 ──
  const exclude = (f: FinderSpace) => me.visitedSlugs.has(f.view.slug) || me.savedIds.has(f.id);
  const rankPool = pool.filter((f) => !exclude(f) && (!area || normalizeArea(f.area) === area));
  const ranked = rankCandidates(rankPool, me.personalized ? me.profile : null, me.curatorBoost);
  const cardOfRanked = (r: (typeof ranked)[number]): HomeCard => {
    const space = homeSpaceFromFinder(r.space);
    const why = cardReason({ visited: false, personalized: me.personalized, matched: r.matched, curationTitle: r.space.curations[0]?.title, collection: null });
    return { space, reason: notes.get(space.id) ?? why ?? space.summary ?? null };
  };
  const forYouCards: HomeCard[] = ranked.slice(0, PER_SHELF).map(cardOfRanked);
  const fixtureFill = area ? fixtures.filter((f) => f.area === area) : fixtures;
  if (opts.fixtures) forYouCards.push(...cardsOf(fixtureFill.slice(0, 6)));
  const forYou: HomeSpaceShelf | null = forYouCards.length
    ? {
        key: "for-you",
        title: area ? `${area}에서 먼저 가볼 공간` : me.personalized ? "회원님을 위해 엄선한 공간" : "공간큐브가 엄선한 공간",
        description: me.personalized ? "저장하고 다녀온 공간을 바탕으로, 아직 가보지 않은 곳을 골랐어요" : "큐레이션에 담긴 공간부터 보여드려요",
        href: area ? `/find?area=${encodeURIComponent(area)}` : "/find",
        cta: "더 보기",
        cards: forYouCards,
      }
    : null;

  // ── 관심 지역 선반 — 별표한 지역의 공간 중 아직 안 가본 곳(같은 개인화 정렬). 지역을 합쳐 선반 하나로(지역마다 선반을 만들지 않는다) ──
  const savedSet = new Set(savedRegions);
  let interest: HomeSpaceShelf | null = null;
  if (!area && savedSet.size > 0) {
    const interestPool = pool.filter((f) => !exclude(f) && savedSet.has(normalizeArea(f.area) ?? ""));
    const present = savedRegions.filter((a) => interestPool.some((f) => normalizeArea(f.area) === a));
    const interestRanked = rankCandidates(interestPool, me.personalized ? me.profile : null, me.curatorBoost);
    if (interestRanked.length > 0) {
      interest = {
        key: "interest",
        title: present.length > 0 && present.length <= 2 ? `${present.join(" · ")}에서 발견한 공간` : "관심 지역에서 발견한 공간",
        description: "별표한 지역의 공간 중, 아직 가보지 않은 곳",
        ...(present.length === 1 ? { href: homeHref({ area: present[0] }), cta: `${present[0]} 둘러보기` } : {}),
        cards: interestRanked.slice(0, PER_SHELF).map(cardOfRanked),
      };
    }
  }

  // ── 나와 비슷한 사람들이 좋아한 공간 — 사람이 아니라 공간을 먼저. 누구의 선택인지는 드러내지 않는다 ──
  const realBySlug = new Map(real.filter((s) => s.slug).map((s) => [s.slug as string, s]));
  const similarCards: HomeCard[] = similarRaw.spaces.flatMap((sp) => {
    const space = realBySlug.get(sp.slug);
    return space ? [{ space, reason: sp.visited ? "나와 비슷한 취향의 사용자가 다녀온 공간" : "나와 비슷한 취향의 사용자가 저장한 공간" }] : [];
  });
  const similar: HomeSpaceShelf | null = similarCards.length >= 2
    ? { key: "similar", title: "나와 비슷한 사람들이 좋아한 공간", description: "취향이 비슷한 사용자가 고른 공간 중, 아직 가보지 않은 곳", cards: similarCards.slice(0, PER_SHELF) }
    : null;

  // ── 계정 선반: 찜한 공간 · 다시 떠올려볼 공간 ──
  const savedList = newestFirst(real.filter((s) => me.savedIds.has(s.id)));
  const saved: HomeSpaceShelf | null = savedList.length
    ? { key: "saved", title: "내가 찜한 공간", description: "가보고 싶다고 담아 둔 곳", href: "/archive/saved", cta: "내 공간", cards: cardsOf(savedList, () => null) }
    : null;
  const visitedList = newestFirst(real.filter((s) => s.slug && me.visitedSlugs.has(s.slug)));
  const revisit: HomeSpaceShelf | null = visitedList.length
    ? { key: "revisit", title: "다시 떠올려볼 공간", description: "다녀온 공간 — 기록을 다시 열어 보거나, 한 번 더 가봐도 좋아요", href: "/archive", cta: "내 공간", cards: cardsOf(visitedList, () => null) }
    : null;

  // ── 지역 · 새로 소개 · 유형 · 테마 선반 ──
  const spaceShelves: HomeSpaceShelf[] = [];
  let themes: ThemeShelf[];
  if (area) {
    for (const c of buildCategoryShelves(inArea, { min: 2, max: 2 })) {
      spaceShelves.push({ key: `cat-${c.category}`, title: `${area}의 ${c.category}`, cards: cardsOf(c.spaces) });
    }
    themes = buildThemeShelves(inArea, { min: 2 });
    for (const t of themes) spaceShelves.push({ key: `theme-${t.theme.key}`, title: `${area}에서 ${t.theme.short}`, cards: cardsOf(t.spaces) });
  } else {
    const fresh = newestFirst(all).slice(0, PER_SHELF);
    if (fresh.length >= 3) spaceShelves.push({ key: "new", title: "새롭게 소개한 공간", description: "공간큐브가 최근에 소개한 곳", href: "/spaces", cta: "공간 전체", cards: cardsOf(fresh) });
    // 관심 지역은 위의 "관심 지역에서 발견한 공간"이 이미 맡았으므로 일반 지역 선반에서는 뺀다
    const areaShelves: AreaShelf[] = buildAreaShelves(all.filter((s) => !(s.area && savedSet.has(s.area))), { min: 3, max: 3 });
    for (const a of areaShelves) {
      spaceShelves.push({ key: `area-${a.area}`, title: `${a.area}에서 머물고 싶은 곳`, description: `${a.area}의 공간 ${a.total}곳 중에서`, href: `/find?area=${encodeURIComponent(a.area)}`, cta: `${a.area} 더 보기`, cards: cardsOf(a.spaces) });
    }
    themes = buildThemeShelves(all, { min: 3 });
    for (const t of themes) spaceShelves.push({ key: `theme-${t.theme.key}`, title: t.theme.title, cards: cardsOf(t.spaces) });
  }

  const areaCurations = visible(curations).filter((c) => !area || normalizeArea(c.area) === area);
  const cubeList = visible(cubeViews).map((s, i) => fromView(s, cubeViews.length - i)).filter((s) => !area || s.area === area);

  return {
    latest: stream.slice(0, LATEST_COUNT),
    areaOptions,
    area,
    areaEmpty: !!area && inArea.length === 0,
    areaCounts: area ? { spaces: inArea.length, curations: areaRow?.curationCount ?? areaCurations.length } : null,
    forYou,
    personalized: me.personalized,
    interest,
    similar,
    similarPeople: similarCards.length >= 2 ? similarRaw.people : [],
    savedRegions,
    saved,
    revisit,
    spaceShelves,
    themeChips: themes.map((t) => ({ key: t.theme.key, label: t.theme.chip })),
    curations: areaCurations.slice(0, 10),
    stories: visible(stories).slice(0, 10),
    cubeSpaces: cubeList.length ? { key: "cube", title: "공간큐브와 함께한 공간", description: "현장에 Cube가 있어, 가면 그 공간의 이야기를 열어 볼 수 있어요", href: "/cube-spaces", cta: "함께한 공간", cards: cardsOf(cubeList) } : null,
    savedIds: me.savedIds,
    loggedIn: !!opts.userId,
  };
}

function mergeAreaCounts(a: { area: string; spaceCount: number; curationCount: number }[], b: { area: string; spaceCount: number; curationCount: number }[]) {
  const map = new Map(a.map((r) => [r.area, { ...r }]));
  for (const r of b) {
    const cur = map.get(r.area) ?? { area: r.area, spaceCount: 0, curationCount: 0 };
    cur.spaceCount += r.spaceCount;
    cur.curationCount += r.curationCount;
    map.set(r.area, cur);
  }
  return [...map.values()];
}
