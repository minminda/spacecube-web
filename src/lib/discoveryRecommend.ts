/* ── 발견 추천(공개 공간 대상) — 설명 가능한 태그 이름 매칭 ──────────────────
   추천 후보는 공개 공간 콘텐츠(EditorialSpace)다. 사용자 취향은 기존 방문 취향 벡터
   (recommend.ts의 buildWeightedTasteVector — Record.tasteScore × SpaceTag.weight)와 저장한 공간을
   "속성 이름" 기준으로 합친다. 운영 태그(Tag.name)와 공개 공간의 category·tags가 같은 어휘를 쓰므로
   (관리자 폼이 기존 태그 이름을 제안) 별도 taxonomy 테이블 없이 연결된다.
   - 점수 0인 공간은 추천하지 않는다(억지로 채우지 않음).
   - 이유 문구는 실제로 겹친 속성 이름으로만 만든다. AI·임의 점수 없음.
   순수 함수 — Prisma 의존 없음(단위 테스트: discoveryRecommend.test.ts). ── */

/** 방문 1건(취향 점수 반영) 대비 저장 1건의 무게 — 저장은 "가보고 싶다"는 중간 신호. */
export const SAVE_WEIGHT = 2;

/**
 * 개인 아카이브 신호 무게(단순 고정값). 기준: Cube 방문 Record는 취향 점수(1~5) × 태그 가중치(보통 1)라 3~5.
 * - 직접 추가(가보고 싶어요): 공간큐브 안에서 저장(2)보다 조금 강한 관심 → 2.5
 * - 다녀왔어요(직접 기록한 실제 경험): 점수 없는 방문의 중립값 → 3 (Cube로 검증된 방문은 점수 반영으로 더 클 수 있음)
 * - 사용자가 직접 고른 태그: 명시적 취향 신호 → 기록 무게 위에 +1을 더 얹는다
 * 연결된 공간이 없는 개인 기록은 사용자가 고른 태그만 쓴다(공간 특징을 추측하지 않음).
 */
export const ARCHIVE_SAVED_WEIGHT = 2.5;
export const ARCHIVE_VISITED_WEIGHT = 3;
export const EXPLICIT_TAG_BONUS = 1;

export function attrKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

export interface TasteProfile {
  /** attrKey → 가중치 */
  weights: Map<string, number>;
  /** attrKey → 표시 이름(처음 본 표기) */
  labels: Map<string, string>;
  visitCount: number;
  saveCount: number;
}

export interface TasteSignals {
  /** 방문 취향 벡터를 이름으로 바꾼 것(가중치 포함) */
  visits: { name: string; weight: number }[];
  /** 방문한 공간 수(중복 제거) — 설명·빈 상태 판단용 */
  visitCount: number;
  /** 저장한 공간마다 그 공간의 속성 이름 목록 */
  saves: string[][];
  /** 무게가 다른 기타 신호(개인 아카이브 기록 등) — 항목마다 이름 목록과 무게 */
  weighted?: { names: string[]; weight: number; kind: "visit" | "save" | "bonus" }[];
}

export function buildTasteProfile(signals: TasteSignals): TasteProfile {
  const weights = new Map<string, number>();
  const labels = new Map<string, string>();
  const add = (name: string, w: number) => {
    const key = attrKey(name);
    if (!key || !(w > 0)) return;
    weights.set(key, (weights.get(key) ?? 0) + w);
    if (!labels.has(key)) labels.set(key, name.trim());
  };
  for (const v of signals.visits) add(v.name, v.weight);
  for (const names of signals.saves) {
    for (const key of new Set(names.map(attrKey))) {
      const name = names.find((n) => attrKey(n) === key) ?? key;
      add(name, SAVE_WEIGHT);
    }
  }
  let extraVisits = 0;
  let extraSaves = 0;
  for (const item of signals.weighted ?? []) {
    const unique = [...new Set(item.names.map(attrKey))].filter(Boolean);
    if (unique.length === 0) continue;
    for (const key of unique) add(item.names.find((n) => attrKey(n) === key) ?? key, item.weight);
    if (item.kind === "visit") extraVisits++;
    else if (item.kind === "save") extraSaves++;
  }
  return { weights, labels, visitCount: signals.visitCount + extraVisits, saveCount: signals.saves.length + extraSaves };
}

export function isEmptyProfile(p: TasteProfile): boolean {
  return p.weights.size === 0;
}

/** 가중치 높은 순 속성 이름 상위 n개. */
export function topAttributes(p: TasteProfile, n = 3): string[] {
  return [...p.weights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k]) => p.labels.get(k) ?? k);
}

export interface DiscoveryCandidate {
  id: string;
  name: string;
  category: string;
  tags?: string[];
}

export function candidateAttributes(c: Pick<DiscoveryCandidate, "category" | "tags">): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of [c.category, ...(c.tags ?? [])]) {
    const k = attrKey(n ?? "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

export interface RankedDiscovery<T extends DiscoveryCandidate> {
  space: T;
  score: number;
  /** 실제로 겹친 속성(취향 가중치 높은 순, 표시 이름) */
  matched: string[];
}

export function rankDiscovery<T extends DiscoveryCandidate>(
  candidates: T[],
  profile: TasteProfile,
  opts: { exclude?: Set<string>; limit?: number } = {},
): RankedDiscovery<T>[] {
  const ranked: RankedDiscovery<T>[] = [];
  for (const space of candidates) {
    if (opts.exclude?.has(space.id)) continue;
    const hits = candidateAttributes(space)
      .map((name) => ({ name, w: profile.weights.get(attrKey(name)) ?? 0 }))
      .filter((h) => h.w > 0)
      .sort((a, b) => b.w - a.w);
    const score = hits.reduce((sum, h) => sum + h.w, 0);
    if (score <= 0) continue;
    ranked.push({ space, score, matched: hits.map((h) => profile.labels.get(attrKey(h.name)) ?? h.name) });
  }
  ranked.sort((a, b) => b.score - a.score || a.space.name.localeCompare(b.space.name, "ko"));
  return opts.limit ? ranked.slice(0, opts.limit) : ranked;
}

/** 카드 한 줄 이유 — 겹친 속성 최대 2개. 겹친 게 없으면 null(문구를 지어내지 않음). */
export function discoveryReason(matched: string[]): string | null {
  if (matched.length === 0) return null;
  return `자주 찾은 '${matched.slice(0, 2).join(" · ")}' 공간과 결이 닮았어요`;
}

/** 페이지 상단 요약 — 실제 신호가 있을 때만. */
export function profileSummary(p: TasteProfile): string | null {
  const top = topAttributes(p, 3);
  if (top.length === 0) return null;
  const source = p.visitCount > 0 && p.saveCount > 0 ? "다녀오고 저장한 공간에서" : p.visitCount > 0 ? "다녀온 공간에서" : "저장한 공간에서";
  return `${source} '${top.join(" · ")}' 결을 자주 골랐어요.`;
}
