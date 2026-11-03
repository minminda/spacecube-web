import { describe, expect, it } from "vitest";
import { buildSimulatedScans, simulateDailyCounts, simulateScanTotals, SIM_DAYS } from "./kpiSimulation";

const IDS = ["cmt2t89p0", "cmswzhiup", "cmt5ahk06", "cmt5aflba", "cmt2ti9ic"];

describe("kpiSimulation", () => {
  it("assigns distinct totals within 15~30 and is deterministic", () => {
    const a = simulateScanTotals(IDS);
    const b = simulateScanTotals([...IDS].reverse());
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
    const values = [...a.values()];
    expect(new Set(values).size).toBe(IDS.length);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(15);
      expect(v).toBeLessThanOrEqual(30);
    }
  });
  it("spreads the total over 30 days exactly and repeatably", () => {
    for (const id of IDS) {
      for (const total of [15, 22, 30]) {
        const d = simulateDailyCounts(id, total);
        expect(d).toHaveLength(SIM_DAYS);
        expect(d.reduce((x, y) => x + y, 0)).toBe(total);
        expect(d).toEqual(simulateDailyCounts(id, total));
      }
    }
  });
  it("builds 30 consecutive KST dates ending today", () => {
    const now = new Date("2026-11-04T03:00:00Z");
    const [s] = buildSimulatedScans([{ id: IDS[0], name: "x" }], now);
    expect(s.daily).toHaveLength(30);
    expect(s.daily[29].date).toBe("2026-11-04");
    expect(s.daily[0].date).toBe("2026-10-06");
    expect(s.daily.reduce((n, d) => n + d.count, 0)).toBe(s.total);
  });
});
