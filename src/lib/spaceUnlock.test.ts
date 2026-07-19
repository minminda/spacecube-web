import { describe, it, expect, beforeAll, vi } from "vitest";
import { createHmac } from "crypto";

// hasSpaceUnlock/grantSpaceUnlock/requireSpaceUnlock/hasAnonymousSpaceAccess는 Prisma·
// next/headers(cookies())에 의존해 DB 없이 단위 테스트할 수 없다(기존 프로젝트 관례상 DB
// 의존 로직은 유닛 테스트 대상이 아님) — 여기서는 서명 토큰의 순수 로직(createQrAccessToken/
// verifyQrAccessToken)만 검증한다. spaceId 일치 여부·큐브 활성 상태 재검증은
// claimQrAccessForUser/hasAnonymousSpaceAccess 내부에서 DB로 확인하므로 이 파일의 범위 밖이다.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests";
});

describe("createQrAccessToken / verifyQrAccessToken", () => {
  it("정상 발급한 토큰은 그대로 검증을 통과하고 원래 payload를 복원한다", async () => {
    const { createQrAccessToken, verifyQrAccessToken } = await import("./spaceUnlock");
    const token = createQrAccessToken("SC-0001", "space-1");
    const payload = verifyQrAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.cubeCode).toBe("SC-0001");
    expect(payload?.spaceId).toBe("space-1");
  });

  it("서명이 조작된 토큰은 거부한다", async () => {
    const { createQrAccessToken, verifyQrAccessToken } = await import("./spaceUnlock");
    const token = createQrAccessToken("SC-0001", "space-1");
    const [body] = token.split(".");
    const tampered = `${body}.forged-signature-xxxxxxxxxxxxxxxxxxxxxxx`;
    expect(verifyQrAccessToken(tampered)).toBeNull();
  });

  it("본문(body)이 조작돼 다른 공간을 가리키도록 바뀌면 서명 불일치로 거부한다", async () => {
    const { createQrAccessToken, verifyQrAccessToken } = await import("./spaceUnlock");
    const token = createQrAccessToken("SC-0001", "space-1");
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ cubeCode: "SC-0001", spaceId: "someone-elses-space", exp: Date.now() + 1000000 })).toString("base64url");
    expect(verifyQrAccessToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it("만료 시각이 지난 토큰은 서명이 유효해도 거부한다", async () => {
    const { verifyQrAccessToken } = await import("./spaceUnlock");
    // 모듈 내부와 동일한 형식(base64url body + HMAC-SHA256 서명)으로, exp만 과거로 둔
    // "정상 서명이지만 만료된" 토큰을 직접 구성해 만료 검증 경로를 테스트한다.
    const expiredPayload = { cubeCode: "SC-0001", spaceId: "space-1", exp: Date.now() - 1000 };
    const body = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const sig = createHmac("sha256", "test-secret-for-unit-tests").update(body).digest("base64url");
    expect(verifyQrAccessToken(`${body}.${sig}`)).toBeNull();
  });

  it("형식이 잘못된 토큰(점이 없거나 base64가 아님)은 거부한다", async () => {
    const { verifyQrAccessToken } = await import("./spaceUnlock");
    expect(verifyQrAccessToken("")).toBeNull();
    expect(verifyQrAccessToken(undefined)).toBeNull();
    expect(verifyQrAccessToken("no-dot-here")).toBeNull();
    expect(verifyQrAccessToken("...")).toBeNull();
  });

  it("서로 다른 cubeCode/spaceId는 서로 다른 토큰을 만든다(재사용 불가)", async () => {
    const { createQrAccessToken } = await import("./spaceUnlock");
    const a = createQrAccessToken("SC-0001", "space-1");
    const b = createQrAccessToken("SC-0002", "space-1");
    expect(a).not.toBe(b);
  });
});

describe("isSpaceUnlockActive — 공간 접근 권한(12시간) 만료 판정", () => {
  it("스캔 직후(0시간 경과)는 유효하다", async () => {
    const { isSpaceUnlockActive } = await import("./spaceUnlock");
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isSpaceUnlockActive(now, now)).toBe(true);
  });

  it("11시간 59분 경과는 아직 유효하다", async () => {
    const { isSpaceUnlockActive } = await import("./spaceUnlock");
    const unlockedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T11:59:00Z");
    expect(isSpaceUnlockActive(unlockedAt, now)).toBe(true);
  });

  it("정확히 12시간 경과는 만료된 것으로 본다(경계 포함)", async () => {
    const { isSpaceUnlockActive } = await import("./spaceUnlock");
    const unlockedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isSpaceUnlockActive(unlockedAt, now)).toBe(false);
  });

  it("12시간을 넘겨 경과하면 만료된다", async () => {
    const { isSpaceUnlockActive } = await import("./spaceUnlock");
    const unlockedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-02T00:00:00Z");
    expect(isSpaceUnlockActive(unlockedAt, now)).toBe(false);
  });

  it("재스캔으로 unlockedAt이 갱신되면 다시 12시간 유효해진다", async () => {
    const { isSpaceUnlockActive } = await import("./spaceUnlock");
    const rescannedAt = new Date("2026-01-02T00:00:00Z");
    const now = new Date("2026-01-02T05:00:00Z");
    expect(isSpaceUnlockActive(rescannedAt, now)).toBe(true);
  });
});

describe("computeUnlockSets — 다중 공간 잠금 상태 계산(순수 함수)", () => {
  it("빈 배열이면 두 집합 모두 비어있다", async () => {
    const { computeUnlockSets } = await import("./spaceUnlock");
    const { unlocked, everUnlocked } = computeUnlockSets([]);
    expect(unlocked.size).toBe(0);
    expect(everUnlocked.size).toBe(0);
  });

  it("활성/만료가 섞여 있으면 unlocked는 활성만, everUnlocked는 전부 포함", async () => {
    const { computeUnlockSets } = await import("./spaceUnlock");
    const now = new Date("2026-01-02T00:00:00Z");
    const rows = [
      { spaceId: "active-space", unlockedAt: new Date("2026-01-01T23:00:00Z") }, // 1시간 전 — 유효
      { spaceId: "expired-space", unlockedAt: new Date("2026-01-01T00:00:00Z") }, // 24시간 전 — 만료
    ];
    const { unlocked, everUnlocked } = computeUnlockSets(rows, now);
    expect(unlocked.has("active-space")).toBe(true);
    expect(unlocked.has("expired-space")).toBe(false);
    expect(everUnlocked.has("active-space")).toBe(true);
    expect(everUnlocked.has("expired-space")).toBe(true);
  });

  it("같은 spaceId가 중복돼도 Set이라 자연히 dedupe된다", async () => {
    const { computeUnlockSets } = await import("./spaceUnlock");
    const now = new Date("2026-01-02T00:00:00Z");
    const rows = [
      { spaceId: "space-1", unlockedAt: new Date("2026-01-01T23:00:00Z") },
      { spaceId: "space-1", unlockedAt: new Date("2026-01-01T20:00:00Z") },
    ];
    const { unlocked, everUnlocked } = computeUnlockSets(rows, now);
    expect(unlocked.size).toBe(1);
    expect(everUnlocked.size).toBe(1);
  });
});
