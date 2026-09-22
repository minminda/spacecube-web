import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// 실제 DB에 연결하지 않는다 — episodeRead.upsert 동시 호출 경쟁으로 인한 P2002를
// 재현하기 위해 prisma를 완전히 모의 객체로 대체한다(기존 episodeEntry.test.ts와 동일한 패턴).
const findUniqueEpisodeMock = vi.fn();
const upsertEpisodeReadMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    episode: { findUnique: (...args: unknown[]) => findUniqueEpisodeMock(...args) },
    episodeRead: { upsert: (...args: unknown[]) => upsertEpisodeReadMock(...args) },
  },
}));

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const cookieGetMock = vi.fn();
const cookieSetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGetMock, set: cookieSetMock }),
}));

function makeP2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`anonId`,`episodeId`)", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
}

describe("POST /api/episode-reads/[episodeId]/view — 익명 조회 이벤트 동시성", () => {
  beforeEach(() => {
    findUniqueEpisodeMock.mockReset();
    upsertEpisodeReadMock.mockReset();
    authMock.mockReset().mockResolvedValue(null); // 비로그인 방문자
    cookieGetMock.mockReset().mockReturnValue({ value: "anon-test-id" });
    cookieSetMock.mockReset();
  });

  it("동일 anonId+episodeId로 upsert가 P2002(동시 요청 경쟁)를 던져도 500이 아니라 204를 반환한다", async () => {
    findUniqueEpisodeMock.mockResolvedValue({ id: "ep-1" });
    upsertEpisodeReadMock.mockRejectedValue(makeP2002());

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/episode-reads/ep-1/view", { method: "POST" });
    const res = await POST(req as never, { params: Promise.resolve({ episodeId: "ep-1" }) });

    expect(res.status).toBe(204);
    expect(upsertEpisodeReadMock).toHaveBeenCalledTimes(1);
  });

  it("upsert가 정상 성공하면 204를 반환한다(회귀 방지)", async () => {
    findUniqueEpisodeMock.mockResolvedValue({ id: "ep-1" });
    upsertEpisodeReadMock.mockResolvedValue({ id: "read-1" });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/episode-reads/ep-1/view", { method: "POST" });
    const res = await POST(req as never, { params: Promise.resolve({ episodeId: "ep-1" }) });

    expect(res.status).toBe(204);
  });

  it("P2002가 아닌 다른 에러는 그대로 전파한다(무해한 에러까지 삼키지 않는지 확인)", async () => {
    findUniqueEpisodeMock.mockResolvedValue({ id: "ep-1" });
    upsertEpisodeReadMock.mockRejectedValue(new Error("connection reset"));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/episode-reads/ep-1/view", { method: "POST" });

    await expect(POST(req as never, { params: Promise.resolve({ episodeId: "ep-1" }) })).rejects.toThrow("connection reset");
  });

  it("로그인 사용자는 이 라우트에서 아무 것도 기록하지 않고 204만 반환한다", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/episode-reads/ep-1/view", { method: "POST" });
    const res = await POST(req as never, { params: Promise.resolve({ episodeId: "ep-1" }) });

    expect(res.status).toBe(204);
    expect(findUniqueEpisodeMock).not.toHaveBeenCalled();
    expect(upsertEpisodeReadMock).not.toHaveBeenCalled();
  });
});
