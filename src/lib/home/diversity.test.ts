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

  it("공간이 6곳에서 24곳으로 늘면 같은 공간이 HOME에서 나오는 횟수가 줄어든다", () => {
    const maxExposure = (n: number) => {
      const pool = Array.from({ length: n }, (_, i) => String(i));
      const shelves = Array.from({ length: 8 }, (_, i) => shelf(`s${i}`, "strong", pool, 4));
      return Math.max(...exposureCounts(run(shelves), (x) => x.id).values());
    };
    expect(maxExposure(6)).toBeGreaterThan(maxExposure(24));
    expect(maxExposure(24)).toBeLessThanOrEqual(2); // 8선반 × 4장 = 32장을 24곳에 나누면 한 공간은 많아야 2번
  });

  describe("hardCap — 한 공간은 HOME에서 2번까지, 남은 카드가 적은 선반은 비운다", () => {
    const cap = (s: DiversityShelf<{ id: string }>[], minCards = 3) => diversifyShelves(s, (x) => x.id, { hardCap: true, minCards });

    it("2번 나온 공간은 세 번째 선반에서 제외된다(후보가 모자라도 채우지 않음)", () => {
      const r = cap([shelf("a", "strong", ["1", "2", "3"], 3), shelf("b", "strong", ["1", "2", "3"], 3), shelf("c", "strong", ["1", "2", "3", "4", "5", "6"], 3)]);
      expect(ids(r[2])).toEqual(["4", "5", "6"]);
      expect(Math.max(...exposureCounts(r, (x) => x.id).values())).toBeLessThanOrEqual(2);
    });

    it("minCards보다 적게 남은 선반은 통째로 비운다", () => {
      const r = cap([shelf("a", "strong", ["1", "2", "3"], 3), shelf("b", "strong", ["1", "2", "3"], 3), shelf("c", "strong", ["1", "2", "3", "4"], 3)]);
      expect(r[2].cards).toEqual([]);
    });

    it("비워진 선반은 노출 횟수를 쓰지 않는다", () => {
      const r = cap([shelf("a", "strong", ["1", "2", "3"], 3), shelf("b", "strong", ["1", "2", "3"], 3), shelf("c", "strong", ["1", "2", "3", "4"], 3), shelf("d", "strong", ["4", "5", "6"], 3)]);
      expect(ids(r[3])).toEqual(["4", "5", "6"]);
    });

    it("none 선반은 항상 보이므로 먼저 세어 둔다 — 앞 선반이 그 공간을 덜 쓴다", () => {
      const r = cap([shelf("a", "strong", ["1", "2", "3", "4"], 3), shelf("saved", "none", ["1", "2"], 2)], 1);
      expect(ids(r[0])).toEqual(["3", "4", "1"]);
      expect(ids(r[1])).toEqual(["1", "2"]);
    });

    it("hardCap이 아니면 기존처럼 후순위로만 보낸다(빼지 않음)", () => {
      const r = run([shelf("a", "strong", ["1"], 1), shelf("b", "strong", ["1"], 1), shelf("c", "strong", ["1"], 1)]);
      expect(ids(r[2])).toEqual(["1"]);
    });
  });
});
