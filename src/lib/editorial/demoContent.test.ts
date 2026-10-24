import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { demoCurations, demoPeople, demoStoriesForSpace, demoThoughts } from "./demoContent";
import { fixtureSpaces } from "@/lib/home/fixtures";
import { collectBlockSpaceIds } from "./input";

const all = () => [...demoCurations(), ...demoPeople(), ...demoThoughts()];

describe("시연용 CURATION · STORY", () => {
  it("개수와 번호 · slug · id가 겹치지 않는다", () => {
    expect(demoCurations()).toHaveLength(4);
    expect(demoPeople()).toHaveLength(2);
    expect(demoThoughts()).toHaveLength(3);
    expect(new Set(all().map((c) => c.id)).size).toBe(9);
    expect(new Set(all().map((c) => c.slug)).size).toBe(9);
    for (const list of [demoCurations(), demoPeople(), demoThoughts()]) expect(new Set(list.map((c) => c.number)).size).toBe(list.length);
  });

  it("대표 이미지가 모두 다르고 파일이 있다(공간 사진을 다른 공간의 것으로 쓰지 않는다)", () => {
    const covers = all().map((c) => c.cover.src as string);
    expect(new Set(covers).size).toBe(covers.length);
    for (const src of covers) expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    // 대표 이미지는 그 콘텐츠가 소개하는 공간의 사진이다
    for (const c of all()) expect(c.spaces.map((l) => l.space.coverImage)).toContain(c.cover.src);
  });

  it("모든 글은 시연용 안내로 시작하고, 본문 공간 카드는 실제 시연 공간을 가리킨다", () => {
    const ids = new Set(fixtureSpaces(0).map((f) => f.id));
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
    for (const p of demoPeople()) {
      expect(p.subjectRole).toContain("가상 페르소나");
      expect(p.blocks.some((b) => b.type === "QUOTE" || b.type === "QNA")).toBe(false);
    }
  });

  it("제거한 시연 PEOPLE(demo-persona-records)은 더 이상 정의되어 있지 않다", () => {
    expect(demoPeople().some((p) => p.slug === "demo-persona-records")).toBe(false);
  });

  it("공간 상세용 소개된 이야기가 연결된다", () => {
    const f = fixtureSpaces(0).find((s) => s.name === "서가 뒤의 창")!;
    const st = demoStoriesForSpace(f.id);
    expect(st.curations.length).toBeGreaterThan(0);
    expect(st.thoughts.length).toBeGreaterThan(0);
  });
});
