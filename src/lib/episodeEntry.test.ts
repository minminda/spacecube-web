import { describe, it, expect, vi, beforeEach } from "vitest";

// resolveEntryDestination은 spaceId 하나만 받는다 — userId/visitCount/로그인 여부를 받을 방법 자체가
// 없으므로, 방문 횟수나 재방문 여부에 따라 다른 Episode로 라우팅하는 기능은 애초에 존재하지 않는다.
// 여기서는 그 유일한 선택 기준(대표 Episode 우선, 없으면 displayOrder가 가장 빠른 공개 Episode)만 검증한다.
const findFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { episode: { findFirst: (...args: unknown[]) => findFirstMock(...args) } } }));

describe("resolveEntryDestination — QR 진입 목적지는 방문 횟수/로그인 여부와 무관하다", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("대표(featured) 공개 Episode가 있으면 그것을 항상 목적지로 고른다", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "featured-ep" }); // isFeatured: true 조회
    const { resolveEntryDestination } = await import("./episodeEntry");

    const result = await resolveEntryDestination("space-1");

    expect(result).toEqual({ type: "episode", episodeId: "featured-ep" });
    expect(findFirstMock).toHaveBeenCalledTimes(1); // 대표를 찾으면 그 다음(가장 빠른 순서) 조회는 하지 않는다
  });

  it("대표 Episode가 없으면 displayOrder가 가장 빠른 공개 Episode로 폴백한다", async () => {
    findFirstMock.mockResolvedValueOnce(null); // featured 없음
    findFirstMock.mockResolvedValueOnce({ id: "first-order-ep" }); // 가장 빠른 순서
    const { resolveEntryDestination } = await import("./episodeEntry");

    const result = await resolveEntryDestination("space-1");

    expect(result).toEqual({ type: "episode", episodeId: "first-order-ep" });
  });

  it("공개된 Episode가 하나도 없으면 공간 페이지로 폴백한다", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    findFirstMock.mockResolvedValueOnce(null);
    const { resolveEntryDestination } = await import("./episodeEntry");

    const result = await resolveEntryDestination("space-1");

    expect(result).toEqual({ type: "space" });
  });

  it("같은 공간에 연속으로 여러 번 호출해도(=같은 사용자가 QR을 여러 번 인식해도) 항상 같은 Episode를 고른다", async () => {
    findFirstMock.mockResolvedValue({ id: "featured-ep" });
    const { resolveEntryDestination } = await import("./episodeEntry");

    const first = await resolveEntryDestination("space-1");
    const second = await resolveEntryDestination("space-1");
    const third = await resolveEntryDestination("space-1");

    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it("두 조회 모두 unlockVisitCount: 0인 Episode만 후보로 삼는다(첫 방문자가 잠긴 Episode로 들어가지 않도록)", async () => {
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { resolveEntryDestination } = await import("./episodeEntry");

    await resolveEntryDestination("space-1");

    expect(findFirstMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ isFeatured: true, unlockVisitCount: 0 }) }));
    expect(findFirstMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ unlockVisitCount: 0 }) }));
  });
});
