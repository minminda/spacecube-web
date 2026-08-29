import { describe, it, expect } from "vitest";
import { isGuestbookFunnelCallback, extractSpaceSlugFromGuestbookCallback } from "./guestbookFunnel";

describe("isGuestbookFunnelCallback", () => {
  it("record 페이지로 가는 경로를 방명록 흐름으로 판정한다", () => {
    expect(isGuestbookFunnelCallback("/space/booknook-yeonnam/record")).toBe(true);
    expect(isGuestbookFunnelCallback("/space/booknook-yeonnam/record?intent=unlock")).toBe(true);
  });

  it("guestbook 페이지로 가는 경로를 방명록 흐름으로 판정한다", () => {
    expect(isGuestbookFunnelCallback("/space/booknook-yeonnam/guestbook")).toBe(true);
  });

  it("무관한 경로는 방명록 흐름이 아니다", () => {
    expect(isGuestbookFunnelCallback("/space/booknook-yeonnam")).toBe(false);
    expect(isGuestbookFunnelCallback("/space/booknook-yeonnam/complete")).toBe(false);
    expect(isGuestbookFunnelCallback("/archive")).toBe(false);
    expect(isGuestbookFunnelCallback("/admin/some-id/report")).toBe(false);
  });

  it("slug에 record/guestbook이 우연히 포함돼도 세그먼트 경계가 다르면 오탐하지 않는다", () => {
    expect(isGuestbookFunnelCallback("/space/foo/recording")).toBe(false);
    expect(isGuestbookFunnelCallback("/space/foo-record/other")).toBe(false);
  });

  it("null/undefined/빈 문자열은 false", () => {
    expect(isGuestbookFunnelCallback(null)).toBe(false);
    expect(isGuestbookFunnelCallback(undefined)).toBe(false);
    expect(isGuestbookFunnelCallback("")).toBe(false);
  });
});

describe("extractSpaceSlugFromGuestbookCallback", () => {
  it("record/guestbook 경로에서 slug를 정확히 뽑는다", () => {
    expect(extractSpaceSlugFromGuestbookCallback("/space/booknook-yeonnam/record")).toBe("booknook-yeonnam");
    expect(extractSpaceSlugFromGuestbookCallback("/space/booknook-yeonnam/record?intent=unlock")).toBe("booknook-yeonnam");
    expect(extractSpaceSlugFromGuestbookCallback("/space/booknook-yeonnam/guestbook")).toBe("booknook-yeonnam");
  });

  it("무관한 경로는 null", () => {
    expect(extractSpaceSlugFromGuestbookCallback("/space/booknook-yeonnam")).toBeNull();
    expect(extractSpaceSlugFromGuestbookCallback("/archive")).toBeNull();
    expect(extractSpaceSlugFromGuestbookCallback(null)).toBeNull();
  });
});
