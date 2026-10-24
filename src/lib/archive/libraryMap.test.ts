import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildMapPoints, isValidCoord, mapState } from "./libraryMap";
import type { LibraryItem } from "./library";

const item = (o: Partial<LibraryItem>): LibraryItem => ({
  key: "s-a", name: "공간", area: "연남동", meta: "", cover: null, coverIsMine: false, visited: false, saved: false,
  visitCount: 0, cubeVisits: 0, photoCount: 0, lastAt: new Date(0), tags: [], personal: false, demo: false, source: null, slug: null, ...o,
});
const hrefOf = (i: LibraryItem) => `/h/${i.key}`;

describe("mapState — 재방문 > 방문 > 저장", () => {
  it("저장만 → saved", () => expect(mapState({ visited: false, saved: true, visitCount: 0 })).toBe("saved"));
  it("저장 + 방문 → visited(방문 우선)", () => expect(mapState({ visited: true, saved: true, visitCount: 1 })).toBe("visited"));
  it("방문 2회 이상 → revisit", () => expect(mapState({ visited: true, saved: true, visitCount: 2 })).toBe("revisit"));
  it("방문 이력 행 없이 다녀옴만 표시돼도 visited", () => expect(mapState({ visited: true, saved: false, visitCount: 0 })).toBe("visited"));
  it("저장 해제 + 방문 있음 → 유지, 저장 해제 + 방문 없음 → 없음", () => {
    expect(mapState({ visited: true, saved: false, visitCount: 1 })).toBe("visited");
    expect(mapState({ visited: false, saved: false, visitCount: 0 })).toBeNull();
  });
});

describe("buildMapPoints", () => {
  const coords = new Map([
    ["s-a", { lat: 37.56, lng: 126.92 }],
    ["s-b", { lat: 37.55, lng: 126.91 }],
    ["s-bad", { lat: 0, lng: 0 }],
  ]);
  it("공간 하나에 마커 하나, 상태·방문 횟수·링크", () => {
    const { points, missing } = buildMapPoints(
      [item({ key: "s-a", saved: true, visited: true, visitCount: 3 }), item({ key: "s-b", name: "저장", saved: true })],
      coords, hrefOf,
    );
    expect(points.map((p) => [p.key, p.state, p.visitCount])).toEqual([["s-a", "revisit", 3], ["s-b", "saved", 0]]);
    expect(missing).toEqual([]);
  });
  it("좌표 없음 · 잘못된 좌표 · 개인 기록은 지도에서 빠지고 개수로 잡힌다", () => {
    const { points, missing } = buildMapPoints(
      [item({ key: "s-none", name: "없음", saved: true }), item({ key: "s-bad", name: "0,0", visited: true, visitCount: 1 }), item({ key: "e-1", name: "개인", visited: true, personal: true })],
      coords, hrefOf,
    );
    expect(points).toEqual([]);
    expect(missing.map((m) => m.name)).toEqual(["없음", "0,0", "개인"]);
  });
  it("저장도 방문도 아닌 항목은 무시", () => {
    expect(buildMapPoints([item({ key: "s-a" })], coords, hrefOf)).toEqual({ points: [], missing: [] });
  });
});

describe("isValidCoord", () => {
  it("범위·NaN 검사", () => {
    expect(isValidCoord(37.5, 127)).toBe(true);
    expect(isValidCoord(NaN, 127)).toBe(false);
    expect(isValidCoord(95, 127)).toBe(false);
    expect(isValidCoord(null, null)).toBe(false);
  });
});
