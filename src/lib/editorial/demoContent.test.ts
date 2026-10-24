import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { demoCurations, demoPeople, demoSpacesComplete, demoStoriesForSpace, demoThoughts, type SpaceByName } from "./demoContent";
import { DEMO_SPACE_SEEDS } from "@/lib/home/demoSpaceSeeds";
import { collectBlockSpaceIds } from "./input";
import type { SpaceView } from "./types";

// DB의 시연용 공간 행을 흉내 낸 map(id는 DB id처럼 seed마다 고유)
const by: SpaceByName = new Map(
  DEMO_SPACE_SEEDS.map((s, i): [string, SpaceView] => [s.name, { id: `db-${i}`, slug: s.slug, name: s.name, area: s.area, category: s.category, coverImage: s.image, tags: s.tags, cubeAvailable: false, isDemo: true, status: "PUBLISHED" }]),
);
const all = () => [...demoCurations(by), ...demoPeople(by), ...demoThoughts(by)];

describe("시연용 CURATION · STORY", () => {
  it("공간 11곳이 모두 있을 때만 쓴다", () => {
    expect(demoSpacesComplete(by)).toBe(true);
    const partial = new Map(by);
    partial.delete("초록 서가");
    expect(demoSpacesComplete(partial)).toBe(false);
    expect(demoStoriesForSpace("db-0", partial)).toEqual({ curations: [], people: [], thoughts: [] });
  });

  it("개수와 번호 · slug · id가 겹치지 않는다", () => {
    expect(demoCurations(by)).toHaveLength(4);
    expect(demoPeople(by)).toHaveLength(2);
    expect(demoThoughts(by)).toHaveLength(3);
    expect(new Set(all().map((c) => c.id)).size).toBe(9);
    expect(new Set(all().map((c) => c.slug)).size).toBe(9);
    for (const list of [demoCurations(by), demoPeople(by), demoThoughts(by)]) expect(new Set(list.map((c) => c.number)).size).toBe(list.length);
  });

  it("대표 이미지가 모두 다르고 파일이 있다(공간 사진을 다른 공간의 것으로 쓰지 않는다)", () => {
    const covers = all().map((c) => c.cover.src as string);
    expect(new Set(covers).size).toBe(covers.length);
    for (const src of covers) expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    for (const c of all()) expect(c.spaces.map((l) => l.space.coverImage)).toContain(c.cover.src);
  });

  it("모든 글은 시연용 안내로 시작하고, 본문 공간 카드는 DB 공간 id를 가리킨다", () => {
    const ids = new Set([...by.values()].map((v) => v.id));
    for (const c of all()) {
      const first = c.blocks[0];
      expect(first.type === "TEXT" && first.text.startsWith("시연용 콘텐츠")).toBe(true);
      const cardIds = collectBlockSpaceIds(c.blocks);
      expect(cardIds.length).toBeGreaterThan(0);
      for (const id of cardIds) expect(ids.has(id)).toBe(true);
      expect(c.status).toBe("PUBLISHED");
    }
  });

  it("PEOPLE은 가상 페르소나로 표시되고 인물의 인용(QUOTE) · 문답(QNA)을 만들지 않는다", () => {
    for (const p of demoPeople(by)) {
      expect(p.subjectRole).toContain("가상 페르소나");
      expect(p.blocks.some((b) => b.type === "QUOTE" || b.type === "QNA")).toBe(false);
    }
  });

  it("제거한 시연 PEOPLE(demo-persona-records)은 더 이상 정의되어 있지 않다", () => {
    expect(demoPeople(by).some((p) => p.slug === "demo-persona-records")).toBe(false);
  });

  it("공간 상세용 소개된 이야기가 연결된다", () => {
    const id = by.get("서가 뒤의 창")!.id;
    const st = demoStoriesForSpace(id, by);
    expect(st.curations.length).toBeGreaterThan(0);
    expect(st.thoughts.length).toBeGreaterThan(0);
  });
});
