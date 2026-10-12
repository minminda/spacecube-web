import { describe, expect, it } from "vitest";
import { INTENT_PARAM, INTENT_TTL_MS, matchPendingIntent, withIntentParam } from "./pendingIntent";

const NOW = 1_800_000_000_000;
const stored = (over: Record<string, unknown> = {}) => ({ n: "nonce-1", k: "save", s: "space-a", t: NOW - 1000, ...over });

describe("matchPendingIntent", () => {
  it("번호 · 공간 · 행동 · 시간이 모두 맞으면 행동 종류", () => {
    expect(matchPendingIntent(stored(), "nonce-1", "space-a", NOW)).toBe("save");
    expect(matchPendingIntent(stored({ k: "visited" }), "nonce-1", "space-a", NOW)).toBe("visited");
  });

  it("주소의 번호가 없거나 다르면 실행하지 않는다(남이 만든 링크)", () => {
    expect(matchPendingIntent(stored(), null, "space-a", NOW)).toBeNull();
    expect(matchPendingIntent(stored(), "guessed", "space-a", NOW)).toBeNull();
  });

  it("다른 공간 화면에서는 실행하지 않는다", () => {
    expect(matchPendingIntent(stored(), "nonce-1", "space-b", NOW)).toBeNull();
  });

  it("지원하지 않는 행동 · 깨진 기록은 무시", () => {
    expect(matchPendingIntent(stored({ k: "follow" }), "nonce-1", "space-a", NOW)).toBeNull();
    expect(matchPendingIntent(null, "nonce-1", "space-a", NOW)).toBeNull();
    expect(matchPendingIntent("save", "nonce-1", "space-a", NOW)).toBeNull();
    expect(matchPendingIntent(stored({ t: "yesterday" }), "nonce-1", "space-a", NOW)).toBeNull();
  });

  it("30분이 지났거나 미래 시각이면 무시", () => {
    expect(matchPendingIntent(stored({ t: NOW - INTENT_TTL_MS - 1 }), "nonce-1", "space-a", NOW)).toBeNull();
    expect(matchPendingIntent(stored({ t: NOW + 60_000 }), "nonce-1", "space-a", NOW)).toBeNull();
    expect(matchPendingIntent(stored({ t: NOW - INTENT_TTL_MS }), "nonce-1", "space-a", NOW)).toBe("save");
  });
});

describe("withIntentParam", () => {
  it("돌아올 주소에 번호를 붙이고 기존 검색어는 유지", () => {
    expect(withIntentParam("/spaces/booknook", "abc")).toBe(`/spaces/booknook?${INTENT_PARAM}=abc`);
    expect(withIntentParam("/spaces/booknook?x=1", "abc")).toBe(`/spaces/booknook?x=1&${INTENT_PARAM}=abc`);
  });

  it("이미 있던 번호는 새 번호로 바꾼다(쌓이지 않음)", () => {
    expect(withIntentParam(`/spaces/booknook?${INTENT_PARAM}=old`, "new")).toBe(`/spaces/booknook?${INTENT_PARAM}=new`);
  });
});
