import { describe, it, expect } from "vitest";
import { addressHint, myStateOf, searchSpaces, searchTokens } from "./spaceSearch";

const S = (id: string, name: string, area: string, category: string, address: string | null = null) => ({ id, name, area, category, address });
const rows = [
  S("1", "북눅 연남", "연남동", "독립서점", "서울 마포구 성미산로"),
  S("2", "턴다운서비스", "연남동", "LP카페", "서울 마포구 동교로"),
  S("3", "녹화버튼", "망원동", "촬영장비", "서울 마포구 망원로"),
  S("4", "북카페 소요", "서촌", "북카페", null),
];

describe("공간 추가 검색", () => {
  it("이름으로 시작하는 공간이 먼저", () => {
    expect(searchSpaces(rows, "북").map((r) => r.id)).toEqual(["1", "4"]);
    expect(searchSpaces(rows, "북눅").map((r) => r.id)).toEqual(["1"]);
  });
  it("지역(정규화) · 유형 · 주소로도", () => {
    expect(searchSpaces(rows, "연남").map((r) => r.id).sort()).toEqual(["1", "2"]);
    expect(searchSpaces(rows, "망원동").map((r) => r.id)).toEqual(["3"]);
    expect(searchSpaces(rows, "LP").map((r) => r.id)).toEqual(["2"]);
    expect(searchSpaces(rows, "동교로").map((r) => r.id)).toEqual(["2"]);
  });
  it("낱말이 여러 개면 모두 맞아야(AND)", () => {
    expect(searchSpaces(rows, "연남 서점").map((r) => r.id)).toEqual(["1"]);
    expect(searchSpaces(rows, "연남 촬영").map((r) => r.id)).toEqual([]);
  });
  it("빈 검색어·없는 공간은 결과 없음(검색어로 공간을 만들지 않는다)", () => {
    expect(searchSpaces(rows, "   ")).toEqual([]);
    expect(searchSpaces(rows, "없는공간이름")).toEqual([]);
    expect(searchTokens(" 북눅  연남 ")).toEqual(["북눅", "연남"]);
  });
  it("주소는 앞부분만", () => {
    expect(addressHint("서울 마포구 성미산로 23길 45 1층 북눅")).toBe("서울 마포구 성미산로 23길 45…");
    expect(addressHint(null)).toBeNull();
  });
});

describe("내가 이미 담은 공간 상태", () => {
  it("기록·저장·Cube 방문을 하나의 상태로", () => {
    expect(myStateOf({ entry: null, saved: false, cubeVisits: 0 })).toEqual({ kind: "none" });
    expect(myStateOf({ entry: null, saved: true, cubeVisits: 0 })).toEqual({ kind: "saved", entryId: null, memo: null });
    expect(myStateOf({ entry: { id: "e", status: "SAVED", memo: "가보고 싶다", visits: 0 }, saved: true, cubeVisits: 0 })).toEqual({ kind: "saved", entryId: "e", memo: "가보고 싶다" });
    expect(myStateOf({ entry: { id: "e", status: "VISITED", memo: null, visits: 2 }, saved: false, cubeVisits: 1 })).toEqual({ kind: "visited", entryId: "e", memo: null, visits: 3 });
    // Cube로만 다녀온 공간도 "다녀온 곳"
    expect(myStateOf({ entry: null, saved: false, cubeVisits: 1 })).toEqual({ kind: "visited", entryId: null, memo: null, visits: 1 });
  });
});
