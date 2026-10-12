import { describe, expect, it } from "vitest";
import { MODAL_RESTORE_ANY, shouldRestoreModal, spaceSlugFromPath } from "./modalRestore";

describe("shouldRestoreModal", () => {
  it("쿠키가 없으면 독립 페이지(주소창 · 외부 링크 진입)", () => {
    expect(shouldRestoreModal(undefined, "booknook-yeonnam")).toBe(false);
    expect(shouldRestoreModal("", "booknook-yeonnam")).toBe(false);
  });

  it("떠난 창의 slug와 같을 때만 창으로", () => {
    expect(shouldRestoreModal("booknook-yeonnam", "booknook-yeonnam")).toBe(true);
    expect(shouldRestoreModal("dasijeom", "booknook-yeonnam")).toBe(false);
  });

  it("닫는 중(뒤로 가기)에 남긴 값은 도착 공간이 무엇이든 창으로", () => {
    expect(shouldRestoreModal(MODAL_RESTORE_ANY, "dasijeom")).toBe(true);
  });

  it("인코딩된 slug · 깨진 값", () => {
    expect(shouldRestoreModal(encodeURIComponent("연남-서점"), "연남-서점")).toBe(true);
    expect(shouldRestoreModal("%E0%A4%A", "x")).toBe(false);
  });
});

describe("spaceSlugFromPath", () => {
  it("/spaces/<slug>만", () => {
    expect(spaceSlugFromPath("/spaces/booknook-yeonnam")).toBe("booknook-yeonnam");
    expect(spaceSlugFromPath("/spaces/booknook-yeonnam/")).toBe("booknook-yeonnam");
    expect(spaceSlugFromPath("/spaces")).toBeNull();
    expect(spaceSlugFromPath("/")).toBeNull();
    expect(spaceSlugFromPath("/space/booknook-yeonnam")).toBeNull();
    expect(spaceSlugFromPath("/spaces/a/b")).toBeNull();
  });
});
