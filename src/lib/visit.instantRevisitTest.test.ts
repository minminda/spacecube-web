import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

// spaceUnlock.ts는 next/headers(cookies())·prisma에 의존한다 — 기존 spaceUnlock.test.ts와
// 동일하게 모킹한다(이 파일에서는 DB/쿠키 없이 순수 함수 isSpaceUnlockActive만 검증).
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

/**
 * ENABLE_INSTANT_REVISIT_TEST는 모듈 로드 시점에 process.env를 한 번만 읽으므로,
 * 플래그 on/off 양쪽을 검증하려면 각 케이스마다 모듈을 새로 import해야 한다.
 * 기존 visit.test.ts(플래그 off 기준 실제 운영 정책 검증)는 건드리지 않는다.
 */
describe("isNewVisitForRecord — 현장 테스트 모드(ENABLE_INSTANT_REVISIT_TEST)", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("플래그가 꺼져 있으면(기본) isNewVisit과 완전히 동일하게 12시간 정책을 따른다", async () => {
    vi.stubEnv("ENABLE_INSTANT_REVISIT_TEST", "");
    vi.resetModules();
    const { isNewVisit, isNewVisitForRecord, REVISIT_INTERVAL_HOURS } = await import("./visit");

    const now = new Date("2026-08-11T12:00:00Z");
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const thirteenHoursAgo = new Date(now.getTime() - 13 * 60 * 60 * 1000);

    expect(REVISIT_INTERVAL_HOURS).toBe(12);
    expect(isNewVisitForRecord(fiveHoursAgo, now)).toBe(isNewVisit(fiveHoursAgo, now));
    expect(isNewVisitForRecord(fiveHoursAgo, now)).toBe(false);
    expect(isNewVisitForRecord(thirteenHoursAgo, now)).toBe(true);
  });

  it("플래그가 켜져 있으면 12시간을 기다리지 않고 5초 뒤 재방문을 새 방문으로 인정한다", async () => {
    vi.stubEnv("ENABLE_INSTANT_REVISIT_TEST", "true");
    vi.resetModules();
    const { isNewVisitForRecord } = await import("./visit");

    const now = new Date("2026-08-11T12:00:00Z");
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    expect(isNewVisitForRecord(tenSecondsAgo, now)).toBe(true);
    expect(isNewVisitForRecord(oneMinuteAgo, now)).toBe(true);
  });

  it("플래그가 켜져 있어도 밀리초 단위 즉시 재요청(더블탭/중복 제출)은 같은 방문으로 취급한다", async () => {
    vi.stubEnv("ENABLE_INSTANT_REVISIT_TEST", "true");
    vi.resetModules();
    const { isNewVisitForRecord } = await import("./visit");

    const now = new Date("2026-08-11T12:00:00Z");
    const halfSecondAgo = new Date(now.getTime() - 500);

    expect(isNewVisitForRecord(halfSecondAgo, now)).toBe(false);
  });

  it("플래그가 켜져 있어도 첫 방문(lastVisitedAt 없음)은 항상 새 방문이다", async () => {
    vi.stubEnv("ENABLE_INSTANT_REVISIT_TEST", "true");
    vi.resetModules();
    const { isNewVisitForRecord } = await import("./visit");

    expect(isNewVisitForRecord(null)).toBe(true);
  });

  it("spaceUnlock의 접근 만료 정책(isSpaceUnlockActive)은 테스트 플래그와 무관하게 12시간을 유지한다", async () => {
    vi.stubEnv("ENABLE_INSTANT_REVISIT_TEST", "true");
    vi.resetModules();
    const { isSpaceUnlockActive } = await import("./spaceUnlock");

    const now = new Date("2026-08-11T12:00:00Z");
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const thirteenHoursAgo = new Date(now.getTime() - 13 * 60 * 60 * 1000);

    // 방금 스캔한 접근 권한은 여전히 유효하고(true), 12시간이 지난 접근 권한은 여전히 만료된다(false) —
    // ENABLE_INSTANT_REVISIT_TEST=true여도 isNewVisit(테스트 플래그 영향 없음) 기준을 그대로 쓴다.
    expect(isSpaceUnlockActive(oneMinuteAgo, now)).toBe(true);
    expect(isSpaceUnlockActive(thirteenHoursAgo, now)).toBe(false);
  });
});
