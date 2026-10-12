/* ── 공간 상세의 "공간 → 콘텐츠" 연결(순수 함수, 서버·테스트 공용) ─────────────────
   새 데이터 없이 이미 있는 큐레이션 연결(EditorialCurationSpace.note · order)만 쓴다.
   큐레이션 순서는 호출부가 넘긴 순서 그대로 — getStoriesForSpace · listCurations와 같은 number DESC
   (가장 최근 큐레이션이 먼저). HOME · 검색 카드의 선정 이유도 같은 순서의 첫 note라서 카드에서 본 이유가
   상세에서도 같은 문장으로 이어진다. 임의(랜덤) 선택은 하지 않는다. ── */

import type { CurationView, SpaceView } from "./types";

export interface SpaceReason {
  note: string;
  curation: { id: string; slug: string; title: string };
}

/** "공간큐브가 고른 이유" — 이 공간에 note가 적힌 큐레이션을 순서대로 최대 max개. */
export function pickSpaceReasons(curations: readonly CurationView[], spaceId: string, max = 1): SpaceReason[] {
  const out: SpaceReason[] = [];
  for (const c of curations) {
    if (out.length >= max) break;
    const note = c.spaces.find((l) => l.space.id === spaceId)?.note?.trim();
    if (note) out.push({ note, curation: { id: c.id, slug: c.slug, title: c.title } });
  }
  return out;
}

/**
 * "이 공간이 소개된 이야기"의 큐레이션 한 줄 — 이 공간에 적힌 note, 없으면 큐레이션 요약.
 * 바로 위 "고른 이유"에 이미 인용한 큐레이션은 같은 문장을 반복하지 않도록 요약을 쓴다.
 */
export function curationLineFor(c: CurationView, spaceId: string, quoted: ReadonlySet<string>): string | null {
  const note = c.spaces.find((l) => l.space.id === spaceId)?.note?.trim();
  if (note && !quoted.has(c.id)) return note;
  return c.summary?.trim() || null;
}

export interface RelatedSpaces {
  /** curation: 모두 같은 큐레이션에 함께 소개된 공간 / area: 모두 같은 지역 / mixed: 함께 소개된 공간 뒤를 같은 지역으로 채움 */
  kind: "curation" | "area" | "mixed";
  spaces: SpaceView[];
}

/**
 * 관련 공간 — ① 같은 큐레이션에 함께 소개된 공간(큐레이션 순서 → 큐레이션 안 순서) ② 모자라면 같은 지역 공간.
 * 자기 자신 제외, 여러 큐레이션에 겹쳐 나와도 한 번만, 최대 limit곳. 점수 계산 없는 고정 규칙이다.
 * sameArea는 호출부가 지역 정규화로 고른 공개 공간 목록(발행 · 시연 제외)이다.
 */
export function relatedSpacesFor(spaceId: string, curations: readonly CurationView[], sameArea: readonly SpaceView[], limit = 3): RelatedSpaces {
  const seen = new Set<string>([spaceId]);
  const fromCuration: SpaceView[] = [];
  for (const c of curations) {
    for (const l of c.spaces) {
      if (seen.has(l.space.id)) continue;
      seen.add(l.space.id);
      fromCuration.push(l.space);
    }
  }
  const picked = fromCuration.slice(0, limit);
  const fill = sameArea.filter((s) => !seen.has(s.id)).slice(0, Math.max(0, limit - picked.length));
  const spaces = [...picked, ...fill];
  const kind = picked.length === 0 ? "area" : fill.length === 0 ? "curation" : "mixed";
  return { kind, spaces };
}
