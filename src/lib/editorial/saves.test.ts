import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  savedEditorial: vi.fn(),
  savedSpace: vi.fn(),
  editorial: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedEditorialSpace: { findMany: m.savedEditorial },
    savedSpace: { findMany: m.savedSpace },
    editorialSpace: { findMany: m.editorial },
  },
}));

import { getSavedEditorialSpaceIds } from "./saves";

describe("getSavedEditorialSpaceIds", () => {
  beforeEach(() => vi.resetAllMocks());

  it("비로그인은 DB를 조회하지 않고 빈 집합", async () => {
    expect((await getSavedEditorialSpaceIds(null)).size).toBe(0);
    expect(m.savedEditorial).not.toHaveBeenCalled();
  });

  it("Cube 상세에서 저장한 운영 공간도 같은 slug의 공개 공간 저장으로 합친다(중복 없이)", async () => {
    m.savedEditorial.mockResolvedValue([{ spaceId: "ed-a" }]);
    m.savedSpace.mockResolvedValue([{ space: { slug: "a" } }, { space: { slug: "booknook" } }]);
    m.editorial.mockResolvedValue([{ id: "ed-a" }, { id: "ed-book" }]);
    const ids = await getSavedEditorialSpaceIds("u1");
    expect([...ids].sort()).toEqual(["ed-a", "ed-book"]);
  });

  it("운영 공간 저장이 없으면 공개 공간을 추가로 조회하지 않는다", async () => {
    m.savedEditorial.mockResolvedValue([{ spaceId: "ed-a" }]);
    m.savedSpace.mockResolvedValue([]);
    const ids = await getSavedEditorialSpaceIds("u1");
    expect([...ids]).toEqual(["ed-a"]);
    expect(m.editorial).not.toHaveBeenCalled();
  });
});
