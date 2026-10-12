import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const count = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { archiveEntry: { findUnique: (...a: unknown[]) => findUnique(...a) }, record: { count: (...a: unknown[]) => count(...a) } } }));

import { getMySpaceState } from "./entries";

const space = { id: "ed1", slug: "booknook" };

describe("getMySpaceState — 공간 추가 검색과 같은 기준(내 기록 방문 + Cube 방문)", () => {
  beforeEach(() => { findUnique.mockReset(); count.mockReset(); });

  it("기록 없음", async () => {
    findUnique.mockResolvedValue(null); count.mockResolvedValue(0);
    expect(await getMySpaceState("u", space, false)).toEqual({ kind: "none" });
  });
  it("저장만(공개 저장)", async () => {
    findUnique.mockResolvedValue(null); count.mockResolvedValue(0);
    expect(await getMySpaceState("u", space, true)).toMatchObject({ kind: "saved", entryId: null });
  });
  it("내 기록 방문 2 + Cube 방문 1 → 3번", async () => {
    findUnique.mockResolvedValue({ id: "e1", status: "VISITED", memo: null, _count: { visits: 2 } }); count.mockResolvedValue(1);
    expect(await getMySpaceState("u", space, true)).toMatchObject({ kind: "visited", entryId: "e1", visits: 3 });
  });
  it("Cube 방문만 → 다녀온 곳, 운영 공간은 같은 slug로 잇는다", async () => {
    findUnique.mockResolvedValue(null); count.mockResolvedValue(1);
    expect(await getMySpaceState("u", space, false)).toMatchObject({ kind: "visited", entryId: null, visits: 1 });
    expect(count).toHaveBeenCalledWith({ where: { userId: "u", space: { slug: "booknook" } } });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_spaceId: { userId: "u", spaceId: "ed1" } } }));
  });
});
