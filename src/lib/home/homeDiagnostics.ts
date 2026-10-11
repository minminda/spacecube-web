/* ── HOME 선반 진단 데이터(서버 전용, 관리자 화면용) ───────────────────────────
   HOME이 선반을 만드는 것과 같은 공개 Pool(초안 · 보관 · 데모 제외)과 콘텐츠를 세어, 선반별 노출 상태와 테마 ↔ 유형/태그 연결 현황을 만든다. ── */

import { listCubeSpaces, listCurations, listStoryItems } from "@/lib/editorial/queries";
import { curatorAccess } from "@/lib/curators/access";
import { getFinderPool } from "@/lib/finder/finderData";
import { homeSpaceFromFinder } from "./homeData";
import { buildAreaShelves, HOME_THEMES } from "./shelves";
import { buildShelfPlan, type PlanItem } from "./shelfConfig";
import { diagnoseShelf, MIN_SHELF_SPACES, type ShelfDiagnosis, type ShelfStats } from "./shelfDiagnosis";
import { loadShelfRows, type EditorialShelfRow } from "./shelfData";
import { applyThemeRules, diagnoseThemes, type ThemeDiagnosis } from "./themeRules";

export interface HomeDiagnostics {
  plan: PlanItem[];
  diagnoses: Record<string, ShelfDiagnosis>;
  themes: ThemeDiagnosis[];
  stats: ShelfStats;
}

export async function loadHomeDiagnostics(rows?: EditorialShelfRow[]): Promise<HomeDiagnostics> {
  const shelfRows = rows ?? (await loadShelfRows());
  // 공개 방문자 기준(관리자 미리보기 · 데모 공간 제외)
  const access = curatorAccess({ admin: false, editorial: false });
  const [pool, curations, stories, cube] = await Promise.all([getFinderPool(access), listCurations({}), listStoryItems({}), listCubeSpaces({})]);
  const spaces = pool.map(homeSpaceFromFinder);
  const themeDefs = applyThemeRules(HOME_THEMES, shelfRows);
  const themes = diagnoseThemes(themeDefs, HOME_THEMES, spaces, MIN_SHELF_SPACES);
  const publicIds = new Set(spaces.map((s) => s.id));
  const editorialCounts: Record<string, number> = {};
  for (const r of shelfRows.filter((x) => x.kind === "EDITORIAL")) editorialCounts[r.key] = r.spaces.filter((l) => publicIds.has(l.spaceId)).length;

  const live = <T extends { status: string }>(list: T[]) => list.filter((x) => x.status !== "ARCHIVED");
  const stats: ShelfStats = {
    publicSpaces: spaces.length,
    areaShelves: buildAreaShelves(spaces, { min: MIN_SHELF_SPACES, max: 999 }).length,
    curations: live(curations).length,
    stories: live(stories).length,
    partnerSpaces: live(cube).length,
    themeOk: themes.filter((t) => t.status === "ok").length,
    themeTotal: themes.length,
    editorialCounts,
  };
  const plan = buildShelfPlan(shelfRows);
  const diagnoses = Object.fromEntries(plan.map((p) => [p.key, diagnoseShelf(p, stats)]));
  return { plan, diagnoses, themes, stats };
}
