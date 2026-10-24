/* ── 검색 데이터 조립(서버 전용) ────────────────────────────────────────────────
   새 검색 서비스 · 새 스키마 없이 기존 데이터로 검색 말뭉치(corpus)를 만든다.
   - 공간 Pool: 추천 > 공간 · HOME과 같은 getFinderPool(발행된 공개 공간, 가상 공간은 관리자 · 로컬 미리보기에서만)
   - 공간 하나에 붙은 말: 이름 · 지역(정규화) · 유형 · 태그 · 한 줄 소개 · 상세 설명 · 담긴 큐레이션의 제목/요약 · 큐레이션에 적힌 선정 이유
   - 지역 목록: HOME 지역 선택과 같은 buildAreaOptions(추천 지역 + 등록된 지역)
   확장: CURATION · STORY도 검색하려면 SearchDoc과 같은 모양의 문서를 더 만들어 searchSpaces 옆에 두면 된다(이번에는 공간 + 지역). ── */

import { prisma } from "@/lib/prisma";
import { curatorAccess } from "@/lib/curators/access";
import { getFinderPool } from "@/lib/finder/finderData";
import { listAreas } from "@/lib/editorial/queries";
import { normalizeArea } from "@/lib/editorial/area";
import { getSavedEditorialSpaceIds } from "@/lib/editorial/saves";
import { homeSpaceFromFinder } from "@/lib/home/homeData";
import { ENABLE_PUBLIC_DEMO_SPACES } from "@/lib/features";
import { applyDemoRegion, buildAreaOptions, type AreaOption, type HomeSpace } from "@/lib/home/shelves";
import { searchRegions, searchSpaces, type SearchDoc } from "./spaceSearch";

export interface SearchCorpus {
  docs: SearchDoc[];
  spaces: Map<string, HomeSpace>;
  /** 카드의 "왜 이 공간인가" 한 줄 — 큐레이션 선정 이유 > 한 줄 소개 */
  reasons: Map<string, string>;
  areaOptions: AreaOption[];
}

/* 말뭉치 캐시 — 일반 방문자 요청만. 공간 수가 늘면 요청마다 전체 풀 + 큐레이션 링크를 다시 읽는 비용이 커져서(50~100곳 약 0.8초 예상)
   짧은 TTL로 같은 서버 인스턴스 안에서만 재사용한다. 관리자(초안 · 미리보기)와 fixtures 미리보기는 캐시하지 않는다.
   관리자가 공간 · 큐레이션을 저장하면 invalidateSearchCorpus()로 그 인스턴스 캐시는 바로 비운다(다른 인스턴스는 TTL 안에 따라온다). */
const CORPUS_TTL_MS = 30_000;
let cached: { at: number; promise: Promise<SearchCorpus> } | null = null;

export function invalidateSearchCorpus(): void {
  cached = null;
}

/** fixtures: 관리자 · 로컬의 ?preview=fixtures에서만 true — 임시 공간(src/lib/home/fixtures.ts)을 말뭉치에 섞는다 */
export async function loadSearchCorpus(opts: { admin: boolean; fixtures?: boolean }): Promise<SearchCorpus> {
  if (opts.admin || opts.fixtures) return buildSearchCorpus(opts);
  if (cached && Date.now() - cached.at < CORPUS_TTL_MS) return cached.promise;
  const promise = buildSearchCorpus(opts);
  const entry = { at: Date.now(), promise };
  cached = entry;
  // 실패한 결과를 캐시에 남기지 않는다
  promise.catch(() => { if (cached === entry) cached = null; });
  return promise;
}

async function buildSearchCorpus(opts: { admin: boolean; fixtures?: boolean }): Promise<SearchCorpus> {
  const access = curatorAccess({ admin: opts.admin, editorial: true });
  const [pool, links, areas] = await Promise.all([
    getFinderPool(access),
    prisma.editorialCurationSpace.findMany({
      where: { curation: { status: "PUBLISHED" } },
      select: { spaceId: true, note: true, curation: { select: { title: true, summary: true } } },
    }),
    listAreas({ preview: false }),
  ]);

  const curationText = new Map<string, string[]>();
  const noteText = new Map<string, string[]>();
  for (const l of links) {
    curationText.set(l.spaceId, [...(curationText.get(l.spaceId) ?? []), l.curation.title, l.curation.summary]);
    if (l.note) noteText.set(l.spaceId, [...(noteText.get(l.spaceId) ?? []), l.note]);
  }

  const docs: SearchDoc[] = [];
  const spaces = new Map<string, HomeSpace>();
  const reasons = new Map<string, string>();
  for (const f of pool) {
    const notes = noteText.get(f.id) ?? [];
    docs.push({
      id: f.id,
      name: f.name,
      area: normalizeArea(f.area),
      category: f.category ?? "",
      tags: f.tags ?? [],
      summary: f.view.summary ?? "",
      description: (f.view.description ?? []).join(" "),
      curation: [...f.curations.map((c) => c.title), ...(curationText.get(f.id) ?? [])],
      reasons: notes,
      order: f.order,
    });
    spaces.set(f.id, homeSpaceFromFinder(f));
    const why = notes[0] ?? f.view.summary;
    if (why) reasons.set(f.id, why);
  }
  // 시연 지역 모드: 이용 가능한 지역은 망원뿐(나머지 "준비 중") — HOME 지역 선택과 같은 규칙
  const areaOptions = buildAreaOptions(areas);
  return { docs, spaces, reasons, areaOptions: ENABLE_PUBLIC_DEMO_SPACES ? applyDemoRegion(areaOptions) : areaOptions };
}

export interface SearchSpaceItem {
  space: HomeSpace;
  reason: string | null;
  saved: boolean;
}
export interface SearchRegionItem {
  area: string;
  spaceCount: number;
  curationCount: number;
  exact: boolean;
  saved: boolean;
  /** false면 아직 이용할 수 없는 지역("준비 중") */
  ready: boolean;
}
export interface SearchResponse {
  q: string;
  /** 검색에 걸린 공간 전체 수(화면에는 앞의 MAX_RESULTS곳만) */
  total: number;
  regions: SearchRegionItem[];
  spaces: SearchSpaceItem[];
}

export const MAX_RESULTS = 48;

/** 검색 실행 — 지역 결과(정확히 같은 지역 먼저)와 관련도 순 공간 결과. 저장 상태는 보는 사람 기준. */
export function runSearch(corpus: SearchCorpus, q: string, saved: { spaceIds: Set<string>; regions: string[] }): SearchResponse {
  const hits = searchSpaces(corpus.docs, q);
  const regions = searchRegions(corpus.areaOptions.map((o) => o.area), q).map((r) => {
    const opt = corpus.areaOptions.find((o) => o.area === r.area)!;
    return { area: r.area, spaceCount: opt.spaceCount, curationCount: opt.curationCount, exact: r.exact, saved: saved.regions.includes(r.area), ready: opt.ready !== false };
  });
  const spaces = hits.slice(0, MAX_RESULTS).flatMap((h) => {
    const space = corpus.spaces.get(h.doc.id);
    return space ? [{ space, reason: corpus.reasons.get(h.doc.id) ?? null, saved: saved.spaceIds.has(h.doc.id) }] : [];
  });
  return { q, total: hits.length, regions, spaces };
}

/** 페이지 · API가 함께 쓰는 한 번에 조회 */
export async function searchForViewer(opts: { admin: boolean; userId: string | null; q: string; regions: string[]; fixtures?: boolean }): Promise<{ corpus: SearchCorpus; result: SearchResponse | null }> {
  const [corpus, spaceIds] = await Promise.all([loadSearchCorpus({ admin: opts.admin, fixtures: opts.fixtures }), getSavedEditorialSpaceIds(opts.userId)]);
  const result = opts.q.trim() ? runSearch(corpus, opts.q, { spaceIds, regions: opts.regions }) : null;
  return { corpus, result };
}
