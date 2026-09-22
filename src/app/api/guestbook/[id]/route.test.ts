import { describe, it, expect, vi, beforeEach } from "vitest";

// 실제 DB에 연결하지 않는다 — 비로그인 작성자(anonId)가 자기 글을 수정/삭제할 수 있는지,
// 다른 사람의 글은 여전히 거부되는지를 모의 객체로 검증한다.
const findUniqueNoteMock = vi.fn();
const updateNoteMock = vi.fn();
const deleteNoteMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestbookNote: {
      findUnique: (...args: unknown[]) => findUniqueNoteMock(...args),
      update: (...args: unknown[]) => updateNoteMock(...args),
      delete: (...args: unknown[]) => deleteNoteMock(...args),
    },
  },
}));

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGetMock }),
}));

function req(body?: unknown) {
  return new Request("http://localhost/api/guestbook/note-1", {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("PATCH/DELETE /api/guestbook/[id] — 익명 작성자 소유권", () => {
  beforeEach(() => {
    findUniqueNoteMock.mockReset();
    updateNoteMock.mockReset();
    deleteNoteMock.mockReset();
    authMock.mockReset().mockResolvedValue(null);
    cookieGetMock.mockReset();
  });

  it("비로그인 작성자 본인(anonId 일치)은 자기 글을 수정할 수 있다", async () => {
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: null, anonId: "anon-abc" });
    updateNoteMock.mockResolvedValue({ id: "note-1", content: "수정된 내용", imageUrl: null });
    cookieGetMock.mockReturnValue({ value: "anon-abc" });

    const { PATCH } = await import("./route");
    const res = await PATCH(req({ content: "수정된 내용" }) as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(200);
    expect(updateNoteMock).toHaveBeenCalledTimes(1);
  });

  it("비로그인 작성자 본인은 자기 글을 삭제할 수 있다", async () => {
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: null, anonId: "anon-abc" });
    cookieGetMock.mockReturnValue({ value: "anon-abc" });

    const { DELETE } = await import("./route");
    const res = await DELETE(req() as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(200);
    expect(deleteNoteMock).toHaveBeenCalledTimes(1);
  });

  it("다른 방문자의 anonId로는 수정할 수 없다(403, 서버가 소유권을 실제로 검증)", async () => {
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: null, anonId: "anon-abc" });
    cookieGetMock.mockReturnValue({ value: "anon-someone-else" });

    const { PATCH } = await import("./route");
    const res = await PATCH(req({ content: "몰래 수정" }) as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(403);
    expect(updateNoteMock).not.toHaveBeenCalled();
  });

  it("anonId 쿠키 자체가 없는 방문자는 401(어떤 글도 자기 것이라 주장할 수 없음)", async () => {
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: null, anonId: "anon-abc" });
    cookieGetMock.mockReturnValue(undefined);

    const { DELETE } = await import("./route");
    const res = await DELETE(req() as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(401);
    expect(deleteNoteMock).not.toHaveBeenCalled();
  });

  it("로그인 사용자는 여전히 userId 기준으로만 본인 글을 수정할 수 있다(회귀 방지)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: "user-1", anonId: null });
    updateNoteMock.mockResolvedValue({ id: "note-1", content: "수정", imageUrl: null });

    const { PATCH } = await import("./route");
    const res = await PATCH(req({ content: "수정" }) as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(200);
  });

  it("로그인 사용자가 남의 글(다른 userId)을 수정하려 하면 403", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2" } });
    findUniqueNoteMock.mockResolvedValue({ id: "note-1", userId: "user-1", anonId: null });

    const { PATCH } = await import("./route");
    const res = await PATCH(req({ content: "몰래 수정" }) as never, { params: Promise.resolve({ id: "note-1" }) });

    expect(res.status).toBe(403);
    expect(updateNoteMock).not.toHaveBeenCalled();
  });
});
