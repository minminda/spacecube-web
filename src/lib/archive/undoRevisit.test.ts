import { describe, it, expect, vi, beforeEach } from "vitest";

const entryFindFirst = vi.fn();
const visitFindMany = vi.fn();
const visitDeleteMany = vi.fn();
const recordCount = vi.fn();
const recordDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    archiveEntry: { findFirst: (...a: unknown[]) => entryFindFirst(...a) },
    archiveVisit: { findMany: (...a: unknown[]) => visitFindMany(...a), deleteMany: (...a: unknown[]) => visitDeleteMany(...a) },
    record: { count: (...a: unknown[]) => recordCount(...a), delete: (...a: unknown[]) => recordDelete(...a), deleteMany: (...a: unknown[]) => recordDelete(...a) },
  },
}));

import { ArchiveError, undoRevisit } from "./entries";

const recent = () => new Date(Date.now() - 60_000);
const visit = (id: string, extra: Partial<{ visitedOn: Date | null; memo: string | null; photos: number; createdAt: Date }> = {}) => ({
  id, visitedOn: extra.visitedOn ?? null, memo: extra.memo ?? null, createdAt: extra.createdAt ?? recent(), _count: { photos: extra.photos ?? 0 },
});

describe("undoRevisit — 공간 상세에서 방금 남긴 재방문 1건만 지운다", () => {
  beforeEach(() => {
    [entryFindFirst, visitFindMany, visitDeleteMany, recordCount, recordDelete].forEach((f) => f.mockReset());
    entryFindFirst.mockResolvedValue({ id: "e1", space: { slug: "booknook" } });
    recordCount.mockResolvedValue(0);
    visitDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("첫 방문(v1) + 방금 재방문(v2) → v2만 지우고 첫 방문은 남긴다", async () => {
    visitFindMany.mockResolvedValue([visit("v2"), visit("v1", { createdAt: new Date("2026-09-01") })]);
    await undoRevisit("u1", "e1", "v2");
    expect(entryFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e1", userId: "u1" } }));
    expect(visitDeleteMany).toHaveBeenCalledTimes(1);
    expect(visitDeleteMany).toHaveBeenCalledWith({ where: { id: "v2", entryId: "e1", visitedOn: null, memo: null, photos: { none: {} } } });
  });

  it("첫 방문 하나뿐이면 지우지 않는다", async () => {
    visitFindMany.mockResolvedValue([visit("v1")]);
    await expect(undoRevisit("u1", "e1", "v1")).rejects.toMatchObject({ status: 409 });
    expect(visitDeleteMany).not.toHaveBeenCalled();
  });

  it("Cube 방문이 있으면 상세에서 남긴 방문은 지울 수 있고, Cube Record는 건드리지 않는다", async () => {
    visitFindMany.mockResolvedValue([visit("v1")]);
    recordCount.mockResolvedValue(1);
    await undoRevisit("u1", "e1", "v1");
    expect(recordCount).toHaveBeenCalledWith({ where: { userId: "u1", space: { slug: "booknook" } } });
    expect(recordDelete).not.toHaveBeenCalled();
    expect(visitDeleteMany).toHaveBeenCalledTimes(1);
  });

  it("여러 번 다녀온 경우에도 가장 최근 방문이 아니면 지우지 않는다", async () => {
    visitFindMany.mockResolvedValue([visit("v4"), visit("v3"), visit("v2"), visit("v1")]);
    await expect(undoRevisit("u1", "e1", "v3")).rejects.toMatchObject({ status: 409 });
    expect(visitDeleteMany).not.toHaveBeenCalled();
  });

  it("다른 사용자의 기록 → 404(존재를 드러내지 않음)", async () => {
    entryFindFirst.mockResolvedValue(null);
    await expect(undoRevisit("intruder", "e1", "v2")).rejects.toBeInstanceOf(ArchiveError);
    await expect(undoRevisit("intruder", "e1", "v2")).rejects.toMatchObject({ status: 404 });
    expect(visitFindMany).not.toHaveBeenCalled();
    expect(visitDeleteMany).not.toHaveBeenCalled();
  });

  it("공개 공간에 연결되지 않은 개인 기록은 대상이 아니다", async () => {
    entryFindFirst.mockResolvedValue({ id: "e1", space: null });
    await expect(undoRevisit("u1", "e1", "v2")).rejects.toMatchObject({ status: 404 });
  });

  it("이 기록에 없는 방문 id → 404", async () => {
    visitFindMany.mockResolvedValue([visit("v2"), visit("v1")]);
    await expect(undoRevisit("u1", "e1", "other")).rejects.toMatchObject({ status: 404 });
  });

  it("이미 취소된 방문(연속 클릭 · 동시 요청) → 404, 다른 방문은 지우지 않는다", async () => {
    visitFindMany.mockResolvedValue([visit("v2"), visit("v1")]);
    visitDeleteMany.mockResolvedValue({ count: 0 });
    await expect(undoRevisit("u1", "e1", "v2")).rejects.toMatchObject({ status: 404 });
    expect(visitDeleteMany).toHaveBeenCalledTimes(1);
  });
});
