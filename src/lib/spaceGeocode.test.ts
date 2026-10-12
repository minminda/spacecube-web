import { describe, it, expect, vi } from "vitest";
import { pickUnambiguous, resolveSpaceCoord } from "./spaceGeocode";

const A = { lat: 37.5665, lng: 126.978 };
const B = { lat: 37.55, lng: 126.92 };

describe("pickUnambiguous", () => {
  it("단일 결과는 채택", () => {
    expect(pickUnambiguous([{ addressType: "ROAD_ADDR", ...A }])).toEqual(A);
  });
  it("동·구 단위(REGION)만 있으면 거부", () => {
    expect(pickUnambiguous([{ addressType: "REGION", ...A }])).toBeNull();
  });
  it("멀리 떨어진 여러 후보는 모호 → 거부", () => {
    expect(pickUnambiguous([{ addressType: "ROAD_ADDR", ...A }, { addressType: "ROAD_ADDR", ...B }])).toBeNull();
  });
  it("같은 건물의 도로명/지번 중복은 채택", () => {
    expect(pickUnambiguous([{ addressType: "ROAD_ADDR", ...A }, { addressType: "REGION_ADDR", lat: A.lat + 0.0001, lng: A.lng }])).toEqual(A);
  });
  it("결과 없음", () => expect(pickUnambiguous([])).toBeNull());
});

describe("resolveSpaceCoord", () => {
  it("신규 + 주소 → geocode", async () => {
    const g = vi.fn().mockResolvedValue(A);
    expect(await resolveSpaceCoord({ existing: null, location: "서울 마포구", incoming: null }, g)).toEqual({ coord: A, status: "linked" });
    expect(g).toHaveBeenCalledTimes(1);
  });
  it("주소 변경 없음 + 좌표 있음 → 재호출 안 함", async () => {
    const g = vi.fn();
    const r = await resolveSpaceCoord({ existing: { location: "X", coord: A }, location: "X", incoming: A }, g);
    expect(r).toEqual({ coord: A, status: "kept" });
    expect(g).not.toHaveBeenCalled();
  });
  it("주소 변경 → 새 좌표", async () => {
    const g = vi.fn().mockResolvedValue(B);
    const r = await resolveSpaceCoord({ existing: { location: "X", coord: A }, location: "Y", incoming: A }, g);
    expect(r).toEqual({ coord: B, status: "linked" });
  });
  it("주소 변경 + geocode 실패 → 옛 좌표 제거", async () => {
    const r = await resolveSpaceCoord({ existing: { location: "X", coord: A }, location: "Y", incoming: A }, async () => null);
    expect(r).toEqual({ coord: null, status: "failed" });
  });
  it("주소 있음 + 좌표 없음 → 시도, 실패해도 null 유지", async () => {
    const g = vi.fn().mockResolvedValue(null);
    const r = await resolveSpaceCoord({ existing: { location: "X", coord: null }, location: "X", incoming: null }, g);
    expect(g).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ coord: null, status: "failed" });
  });
  it("관리자가 직접 고른 새 좌표는 geocode 없이 신뢰", async () => {
    const g = vi.fn();
    const r = await resolveSpaceCoord({ existing: { location: "X", coord: A }, location: "Y", incoming: B }, g);
    expect(r).toEqual({ coord: B, status: "manual" });
    expect(g).not.toHaveBeenCalled();
  });
});
