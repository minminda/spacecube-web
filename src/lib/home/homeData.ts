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
  HOME_THEMES,
  homeHref,
  newestFirst,
  spacesInArea,
  type AreaOption,
  type AreaShelf,
  type HomeSpace,
} from "./shelves";
import { similarPeopleForHome, type SimilarPerson } from "@/lib/people/peopleData";
import { demoSpaces, fixtureAreaCounts, fixtureSpaces, type FixtureSpace } from "./fixtures";
import { ENABLE_PUBLIC_DEMO_SPACES } from "@/lib/features";
import { diversifyShelves, type DiversityStrength } from "./diversity";
import { buildShelfPlan, type PlanItem } from "./shelfConfig";
import { loadShelfRows } from "./shelfData";
import { applyThemeRules } from "./themeRules";

const LATEST_COUNT = 5;
const PER_SHELF = 12;
/** 선반이 중복을 피해 고를 수 있도록 먼저 만들어 두는 후보 수(화면에는 PER_SHELF까지만) */
const CANDIDATES = 36;

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
  curations: CurationView[];
  stories: StoryItem[];
  cubeSpaces: HomeSpaceShelf | null;
  savedIds: Set<string>;
  loggedIn: boolean;
  /** 운영자가 정한 선반 노출 · 순서(기본값 포함) — HOME은 이 순서대로 선반을 그린다 */
  plan: PlanItem[];
  /** 운영자가 만든 EDITORIAL 선반(plan의 key로 찾는다) — 포함 공간이 1곳 이상 공개 상태일 때만 */
  editorialShelves: Record<string, HomeSpaceShelf>;
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
  const [stream, stories, curations, cubeViews, areas, pool, me, similarRaw, shelfRows] = await Promise.all([
    listContentStream(v),
    listStoryItems(v),
    listCurations(v),
    listCubeSpaces(v),
    listAreas(v),
    getFinderPool(access),
    getFinderViewer(opts.userId, access),
    // 지역을 고른 화면에서는 쓰지 않는다 — 계산하지 않는다(관리자 · 로컬 개발은 더미 계정도 섞인 미리보기)
    opts.area ? Promise.resolve({ people: [] as SimilarPerson[], spaces: [] as { slug: string; visited: boolean }[] }) : similarPeopleForHome(opts.userId, { includeDemo: previewDemoUsers(opts.admin) }),
    loadShelfRows(),
  ]);
  const visible = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status !== "ARCHIVED");

  // 공간 → 큐레이션에 적힌 선정 이유(가장 최근 큐레이션 것 하나)
  const notes = new Map<string, string>();
  for (const c of visible(curations)) for (const l of c.spaces) if (l.note && !notes.has(l.space.id)) notes.set(l.space.id, l.note);
  const reasonOf = (s: HomeSpace) => notes.get(s.id) ?? (s.fixture ? (s as FixtureSpace).reason : null) ?? s.summary ?? null;

  const real = pool.map(homeSpaceFromFinder);
  // 미리보기(?preview=fixtures)는 글자만 있는 임시 공간까지, 일반 방문자는 사진 기반 시연용 공간만(ENABLE_PUBLIC_DEMO_SPACES)
  const fixtures = opts.fixtures ? fixtureSpaces(real.length + 1) : ENABLE_PUBLIC_DEMO_SPACES ? demoSpaces(real.length + 1) : [];
  const all = [...real, ...fixtures];

  const areaOptions = buildAreaOptions(mergeAreaCounts(areas, fixtures.length ? fixtureAreaCounts(!opts.fixtures) : []));
  const area = normalizeArea(opts.area);
  const inArea = area ? spacesInArea(all, area) : all;
  const areaRow = area ? areaOptions.find((o) => o.area === area) : null;

  const cardsOf = (list: HomeSpace[], reason: (s: HomeSpace) => string | null = reasonOf, n = PER_SHELF): HomeCard[] =>
    list.slice(0, n).map((space) => ({ space, reason: reason(space) }));

  // ── 개인화(또는 편집) 선반: 이미 다녀왔거나 찜한 곳은 빼고 "새로 발견할" 공간만 — 기존 추천 정렬 그대로 ──
  const exclude = (f: FinderSpace) => me.visitedSlugs.has(f.view.slug) || me.savedIds.has(f.id);
  const rankPool = pool.filter((f) => !exclude(f) && (!area || normalizeArea(f.area) === area));
  const ranked = rankCandidates(rankPool, me.personalized ? me.profile : null, me.curatorBoost);
  const cardOfRanked = (r: (typeof ranked)[number]): HomeCard => {
    const space = homeSpaceFromFinder(r.space);
    const why = cardReason({ visited: false, personalized: me.personalized, matched: r.matched, curationTitle: r.space.curations[0]?.title, collection: null });
    return { space, reason: notes.get(space.id) ?? why ?? space.summary ?? null };
  };
  const forYouCards: HomeCard[] = ranked.slice(0, CANDIDATES).map(cardOfRanked);
  const forYouShown = Math.min(forYouCards.length, PER_SHELF);
  let forYouFixtureCount = 0;
  const fixtureFill = area ? fixtures.filter((f) => f.area === area) : fixtures;
  if (fixtures.length > 0) {
    // 첫 선반에 한 지역만 몰리지 않도록 지역을 돌아가며 6곳
    const byArea = new Map<string, HomeSpace[]>();
    for (const f of fixtureFill) byArea.set(f.area ?? "", [...(byArea.get(f.area ?? "") ?? []), f]);
    const rotated: HomeSpace[] = [];
    for (let i = 0; rotated.length < fixtureFill.length; i++) for (const list of byArea.values()) if (list[i]) rotated.push(list[i]);
    forYouCards.push(...cardsOf(rotated.slice(0, 6)));
    forYouFixtureCount = Math.min(6, rotated.length);
  }
  const forYou: HomeSpaceShelf | null = forYouCards.length
    ? {
        key: "for-you",
        title: area ? `${area}에서 먼저 가볼 공간` : me.personalized ? "회원님을 위해 엄선한 공간" : "공간큐브가 엄선한 공간",
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
        ...(present.length === 1 ? { href: homeHref({ area: present[0] }), cta: `${present[0]} 둘러보기` } : {}),
        cards: interestRanked.slice(0, CANDIDATES).map(cardOfRanked),
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
    ? { key: "similar", title: "나와 비슷한 사람들이 좋아한 공간", cards: similarCards.slice(0, CANDIDATES) }
    : null;

  // ── 계정 선반: 찜한 공간 · 다시 떠올려볼 공간 ──
  const savedList = newestFirst(real.filter((s) => me.savedIds.has(s.id)));
  const saved: HomeSpaceShelf | null = savedList.length
    ? { key: "saved", title: "내가 찜한 공간", href: "/archive/saved", cta: "내 공간", cards: cardsOf(savedList, () => null) }
    : null;
  const visitedList = newestFirst(real.filter((s) => s.slug && me.visitedSlugs.has(s.slug)));
  const revisit: HomeSpaceShelf | null = visitedList.length
    ? { key: "revisit", title: "다시 떠올려볼 공간", href: "/archive", cta: "내 공간", cards: cardsOf(visitedList, () => null) }
    : null;

  // ── 지역 · 새로 소개 · 유형 · 테마 선반 ──
  // 테마 연결 키워드: 운영자가 바꾼 값이 있으면 그것, 없으면 코드 기본값
  const themeDefs = applyThemeRules(HOME_THEMES, shelfRows);
  const spaceShelves: HomeSpaceShelf[] = [];
  if (area) {
    for (const c of buildCategoryShelves(inArea, { min: 2, max: 2 })) {
      spaceShelves.push({ key: `cat-${c.category}`, title: `${area}의 ${c.category}`, cards: cardsOf(c.spaces, reasonOf, CANDIDATES) });
    }
    const themes = buildThemeShelves(inArea, { min: 2, perShelf: CANDIDATES, themes: themeDefs });
    for (const t of themes) spaceShelves.push({ key: `theme-${t.theme.key}`, title: `${area}에서 ${t.theme.short}`, cards: cardsOf(t.spaces, reasonOf, CANDIDATES) });
  } else {
    const fresh = newestFirst(all).slice(0, CANDIDATES);
    if (fresh.length >= 3) spaceShelves.push({ key: "new", title: "새롭게 소개한 공간", href: "/spaces", cta: "공간 전체", cards: cardsOf(fresh, reasonOf, CANDIDATES) });
    // 관심 지역은 위의 "관심 지역에서 발견한 공간"이 이미 맡았으므로 일반 지역 선반에서는 뺀다
    const areaShelves: AreaShelf[] = buildAreaShelves(all.filter((s) => !(s.area && savedSet.has(s.area))), { min: 3, max: 3, perShelf: CANDIDATES });
    for (const a of areaShelves) {
      spaceShelves.push({ key: `area-${a.area}`, title: `${a.area}에서 머물고 싶은 곳`, href: `/find?area=${encodeURIComponent(a.area)}`, cta: `${a.area} 더 보기`, cards: cardsOf(a.spaces, reasonOf, CANDIDATES) });
    }
    const themes = buildThemeShelves(all, { min: 3, perShelf: CANDIDATES, themes: themeDefs });
    for (const t of themes) spaceShelves.push({ key: `theme-${t.theme.key}`, title: t.theme.title, cards: cardsOf(t.spaces, reasonOf, CANDIDATES) });
  }

  // ── EDITORIAL 선반: 공개 공간 Pool에 있는 공간만(초안 · 보관 · 데모 공간은 자동으로 빠진다), 운영자가 정한 순서 그대로 ──
  const realById = new Map(real.map((r) => [r.id, r]));
  const editorialShelves: Record<string, HomeSpaceShelf> = {};
  for (const r of shelfRows.filter((x) => x.kind === "EDITORIAL" && x.visible)) {
    const cards: HomeCard[] = r.spaces.flatMap((l) => {
      const space = realById.get(l.spaceId);
      return space ? [{ space, reason: l.note ?? reasonOf(space) }] : [];
    });
    if (cards.length > 0 && r.title) editorialShelves[r.key] = { key: r.key, title: r.title, description: r.description ?? undefined, cards };
  }

  const areaCurations = visible(curations).filter((c) => !area || normalizeArea(c.area) === area);
  const cubeList = visible(cubeViews).map((s, i) => fromView(s, cubeViews.length - i)).filter((s) => !area || s.area === area);

  const cubeSpaces: HomeSpaceShelf | null = cubeList.length ? { key: "cube", title: "공간큐브와 함께한 공간", href: "/cube-spaces", cta: "함께한 공간", cards: cardsOf(cubeList) } : null;
  const plan = buildShelfPlan(shelfRows);

  // ── 같은 공간이 HOME에서 반복되지 않도록: 보이는 순서대로 노출 횟수를 세며 후보를 재정렬(기존 ranking 유지) ──
  diversifyHome({
    plan,
    shelves: [
      { shelf: forYou, strength: "light", limit: forYouShown + forYouFixtureCount },
      { shelf: interest, strength: "light", limit: PER_SHELF },
      { shelf: similar, strength: "light", limit: PER_SHELF },
      { shelf: saved, strength: "none", limit: PER_SHELF },
      { shelf: revisit, strength: "none", limit: PER_SHELF },
      { shelf: cubeSpaces, strength: "none", limit: PER_SHELF },
      ...spaceShelves.map((shelf) => ({ shelf, strength: (shelf.key.startsWith("area-") || shelf.key.startsWith("cat-") ? "light" : "strong") as DiversityStrength, limit: PER_SHELF })),
      ...(area ? [] : Object.values(editorialShelves).map((shelf) => ({ shelf, strength: "strong" as DiversityStrength, limit: shelf.cards.length }))),
    ],
  });

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
    curations: areaCurations.slice(0, 10),
    stories: visible(stories).slice(0, 10),
    cubeSpaces,
    savedIds: me.savedIds,
    loggedIn: !!opts.userId,
    plan,
    editorialShelves,
  };
}

export function mergeAreaCounts(a: { area: string; spaceCount: number; curationCount: number }[], b: { area: string; spaceCount: number; curationCount: number }[]) {
  const map = new Map(a.map((r) => [r.area, { ...r }]));
  for (const r of b) {
    const cur = map.get(r.area) ?? { area: r.area, spaceCount: 0, curationCount: 0 };
    cur.spaceCount += r.spaceCount;
    cur.curationCount += r.curationCount;
    map.set(r.area, cur);
  }
  return [...map.values()];
}

/** 선반 key → 노출 계획(plan)의 key. 지역 · 유형 · 테마 선반은 하나의 plan 항목이 여러 선반을 만든다. */
function planKeyOf(key: string): string {
  if (key.startsWith("area-") || key.startsWith("cat-")) return "area";
  if (key.startsWith("theme-")) return "theme";
  return key;
}

interface DiversityEntry {
  shelf: HomeSpaceShelf | null;
  strength: DiversityStrength;
  limit: number;
}

/** HOME에 실제로 보이는 선반만, 보이는 순서대로 diversifyShelves에 넣고 결과 카드를 선반에 되돌려 넣는다(선반 객체를 제자리에서 갱신). */
export function diversifyHome(input: { plan: PlanItem[]; shelves: DiversityEntry[] }): void {
  const order = input.plan.filter((p) => p.visible).map((p) => p.key);
  const entries = input.shelves.filter((e): e is DiversityEntry & { shelf: HomeSpaceShelf } => !!e.shelf);
  const rank = (e: { shelf: HomeSpaceShelf }) => {
    const i = order.indexOf(planKeyOf(e.shelf.key));
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const visible = entries.map((e, idx) => ({ e, idx })).filter((x) => rank(x.e) !== Number.MAX_SAFE_INTEGER).sort((a, b) => rank(a.e) - rank(b.e) || a.idx - b.idx).map((x) => x.e);
  // 엄선한 공간은 계획상 어디에 있든 먼저 센다 — 새롭게 소개한 공간이 그만큼 덜 노출된 공간을 먼저 고르도록
  visible.sort((a, b) => Number(b.shelf.key === "for-you") - Number(a.shelf.key === "for-you"));
  const result = diversifyShelves(visible.map((e) => ({ key: e.shelf.key, strength: e.strength, limit: e.limit, cards: e.shelf.cards })), (c) => c.space.id);
  result.forEach((r, i) => { visible[i].shelf.cards = r.cards; });
  // 보이지 않는 선반은 화면 수만큼만
  for (const e of entries) if (!visible.includes(e)) e.shelf.cards = e.shelf.cards.slice(0, e.limit);
}
