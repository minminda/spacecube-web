import { describe, it, expect, beforeAll, vi } from "vitest";
import { createHmac } from "crypto";

// hasSpaceUnlock/grantSpaceUnlock/requireSpaceUnlock은 Prisma·next/headers(cookies())에
// 의존해 DB 없이 단위 테스트할 수 없다(기존 프로젝트 관례상 DB 의존 로직은 유닛 테스트 대상이
// 아님) — 여기서는 서명 토큰의 순수 로직(createPendingUnlockToken/verifyPendingUnlockToken)만
// 검증한다. spaceId 일치 여부·큐브 활성 상태 재검증은 consumePendingUnlockCookie 내부에서
// DB로 확인하므로 이 파일의 범위 밖이다.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
});

describe("createPendingUnlockToken / verifyPendingUnlockToken", () => {
  it("정상 발급한 토큰은 그대로 검증을 통과하고 원래 payload를 복원한다", async () => {
    const { createPendingUnlockToken, verifyPendingUnlockToken } = await import("./spaceUnlock");
    const token = createPendingUnlockToken("SC-0001", "space-1");
    const payload = verifyPendingUnlockToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.cubeCode).toBe("SC-0001");
    expect(payload?.spaceId).toBe("space-1");
  });

  it("서명이 조작된 토큰은 거부한다", async () => {
    const { createPendingUnlockToken, verifyPendingUnlockToken } = await import("./spaceUnlock");
    const token = createPendingUnlockToken("SC-0001", "space-1");
    const [body] = token.split(".");
    const tampered = `${body}.forged-signature-xxxxxxxxxxxxxxxxxxxxxxx`;
    expect(verifyPendingUnlockToken(tampered)).toBeNull();
  });

  it("본문(body)이 조작돼 다른 공간을 가리키도록 바뀌면 서명 불일치로 거부한다", async () => {
    const { createPendingUnlockToken, verifyPendingUnlockToken } = await import("./spaceUnlock");
    const token = createPendingUnlockToken("SC-0001", "space-1");
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ cubeCode: "SC-0001", spaceId: "someone-elses-space", exp: Date.now() + 1000000 })).toString("base64url");
    expect(verifyPendingUnlockToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it("만료 시각이 지난 토큰은 서명이 유효해도 거부한다", async () => {
    const { verifyPendingUnlockToken } = await import("./spaceUnlock");
    // 모듈 내부와 동일한 형식(base64url body + HMAC-SHA256 서명)으로, exp만 과거로 둔
    // "정상 서명이지만 만료된" 토큰을 직접 구성해 만료 검증 경로를 테스트한다.
    const expiredPayload = { cubeCode: "SC-0001", spaceId: "space-1", exp: Date.now() - 1000 };
    const body = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const sig = createHmac("sha256", "test-secret-for-unit-tests").update(body).digest("base64url");
    expect(verifyPendingUnlockToken(`${body}.${sig}`)).toBeNull();
  });

  it("형식이 잘못된 토큰(점이 없거나 base64가 아님)은 거부한다", async () => {
    const { verifyPendingUnlockToken } = await import("./spaceUnlock");
    expect(verifyPendingUnlockToken("")).toBeNull();
    expect(verifyPendingUnlockToken(undefined)).toBeNull();
    expect(verifyPendingUnlockToken("no-dot-here")).toBeNull();
    expect(verifyPendingUnlockToken("...")).toBeNull();
  });

  it("서로 다른 cubeCode/spaceId는 서로 다른 토큰을 만든다(재사용 불가)", async () => {
    const { createPendingUnlockToken } = await import("./spaceUnlock");
    const a = createPendingUnlockToken("SC-0001", "space-1");
    const b = createPendingUnlockToken("SC-0002", "space-1");
    expect(a).not.toBe(b);
  });
});
