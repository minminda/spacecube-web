import { describe, it, expect } from "vitest";
import { diversifyShelves, exposureCounts, type DiversityShelf } from "./diversity";

const c = (id: string) => ({ id });
const ids = (r: { cards: { id: string }[] }) => r.cards.map((x) => x.id);
const shelf = (key: string, strength: DiversityShelf<{ id: string }>["strength"], list: string[], limit = 3): DiversityShelf<{ id: string }> => ({ key, strength, limit, cards: list.map(c) });
const run = (s: DiversityShelf<{ id: string }>[]) => diversifyShelves(s, (x) => x.id);

describe("HOME 선반 다양성", () => {
  it("strong: 덜 나온 공간이 먼저, 같은 횟수면 원래 순서", () => {
    const [a, b] = run([shelf("a", "strong", ["1", "2", "3"]), shelf("b", "strong", ["1", "2", "4", "5", "3"])]);
    expect(ids(a)).toEqual(["1", "2", "3"]);
    expect(ids(b)).toEqual(["4", "5", "2"]); // 같은 1회끼리는 앞 선반의 첫 카드였던 1을 뒤로
  });

  it("두 번 나온 공간은 세 번째엔 후순위, 후보가 모자라면 중복 허용", () => {
    const r = run([shelf("a", "strong", ["1"], 1), shelf("b", "strong", ["1"], 1), shelf("c", "strong", ["1", "2"], 1), shelf("d", "strong", ["1"], 1)]);
    expect(ids(r[2])).toEqual(["2"]);
    expect(ids(r[3])).toEqual(["1"]); // 다른 후보가 없으면 3번째라도 채운다
  });

  it("light: 2회 이상만 뒤로, 1회는 원래 순서 유지", () => {
    const r = run([shelf("a", "none", ["1", "2"], 2), shelf("b", "none", ["1", "3"], 2), shelf("c", "light", ["1", "4", "2"], 2)]);
    expect(ids(r[2])).toEqual(["4", "2"]);
    const r2 = run([shelf("a", "none", ["2"], 1), shelf("c", "light", ["2", "4"], 2)]);
    expect(ids(r2[1])).toEqual(["2", "4"]);
  });

  it("none: 순서도 수도 건드리지 않고(limit만), 노출 횟수에는 센다", () => {
    const r = run([shelf("a", "strong", ["1", "2"], 2), shelf("saved", "none", ["1", "2", "3"], 3)]);
    expect(ids(r[1])).toEqual(["1", "2", "3"]);
  });

  it("limit보다 많은 후보에서 limit개만 고른다", () => {
    const r = run([shelf("a", "strong", ["1", "2", "3", "4"], 2)]);
    expect(ids(r[0])).toEqual(["1", "2"]);
    expect([...exposureCounts(r, (x) => x.id).values()]).toEqual([1, 1]);
  });
});
