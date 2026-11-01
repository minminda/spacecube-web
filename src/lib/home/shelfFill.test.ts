import { describe, it, expect } from "vitest";
import { fillShelves, type FillShelf } from "./shelfFill";

interface C { id: string; tags: string[] }
const c = (id: string, ...tags: string[]): C => ({ id, tags });
const idOf = (x: C) => x.id;
const tagsOf = (x: C) => x.tags;
const opts = { target: 4, maxPerSpace: 2, minNative: 2 };

const pool: C[] = [c("a", "책"), c("b", "책"), c("m1", "음악"), c("m2", "음악"), c("m3", "음악"), c("x", "커피"), c("y", "전시"), c("z", "소품")];

describe("fillShelves", () => {
  it("모자란 선반을 같은 주제 공간부터 target까지 채운다", () => {
    const shelves: FillShelf<C>[] = [{ key: "music", fillable: true, cards: [c("m1", "음악"), c("m2", "음악")] }];
    const out = fillShelves(shelves, pool, idOf, tagsOf, opts);
    expect(out[0].cards).toHaveLength(4);
    expect(out[0].cards.map(idOf)).toContain("m3"); // 같은 태그가 먼저
    expect(new Set(out[0].cards.map(idOf)).size).toBe(4); // 한 선반 안에서 중복 없음
  });

  it("한 공간은 전체에서 maxPerSpace회를 넘지 않는다", () => {
    const shelves: FillShelf<C>[] = [
      { key: "s1", fillable: true, cards: [c("a", "책"), c("b", "책")] },
      { key: "s2", fillable: true, cards: [c("a", "책"), c("b", "책")] },
      { key: "s3", fillable: true, cards: [c("m1", "음악"), c("m2", "음악")] },
    ];
    const out = fillShelves(shelves, pool, idOf, tagsOf, opts);
    const counts = new Map<string, number>();
    for (const s of out) for (const x of s.cards) counts.set(x.id, (counts.get(x.id) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
  });

  it("원래 카드가 minNative보다 적거나 채울 공간이 없으면 선반을 없앤다", () => {
    const shelves: FillShelf<C>[] = [
      { key: "tiny", fillable: true, cards: [c("m1", "음악")] },
      { key: "ok", fillable: true, cards: [c("a", "책"), c("b", "책")] },
    ];
    const out = fillShelves(shelves, pool, idOf, tagsOf, opts);
    expect(out.find((s) => s.key === "tiny")!.cards).toHaveLength(0);
    expect(out.find((s) => s.key === "ok")!.cards).toHaveLength(4);
  });

  it("채울 수 없는 선반(fillable=false)은 그대로 두고 노출 횟수로만 센다", () => {
    const fixed = [c("a", "책"), c("b", "책")];
    const shelves: FillShelf<C>[] = [
      { key: "cube", fillable: false, cards: fixed },
      { key: "books", fillable: true, cards: [c("a", "책"), c("b", "책")] },
    ];
    const out = fillShelves(shelves, pool, idOf, tagsOf, opts);
    expect(out[0].cards).toEqual(fixed);
    expect(out[1].cards).toHaveLength(4);
  });

  it("바로 앞 선반에 있던 공간은 뒤로 미룬다", () => {
    const shelves: FillShelf<C>[] = [
      { key: "p", fillable: false, cards: [c("x", "커피"), c("y", "전시")] },
      { key: "q", fillable: true, cards: [c("m1", "음악"), c("m2", "음악")] },
    ];
    const out = fillShelves(shelves, pool, idOf, tagsOf, { ...opts, target: 4 });
    expect(out[1].cards.map(idOf)).not.toContain("x");
  });
});
