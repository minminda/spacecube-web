import { describe, expect, it } from "vitest";
import { adminBackFallback } from "./adminNav";

describe("adminBackFallback — 기록 없이 들어온 관리자 화면의 상위 화면", () => {
  it.each([
    ["/admin", null],
    ["/admin/", null],
    ["/", null],
    ["/admin/content", "/admin"],
    ["/admin/content/thoughts/abc", "/admin/content"],
    ["/admin/content/people/new", "/admin/content"],
    ["/admin/content/curations/abc", "/admin/content"],
    ["/admin/content/curations", "/admin/content"],
    ["/admin/content/spaces", "/admin/content"],
    ["/admin/content/spaces/abc", "/admin/content/spaces"],
    ["/admin/content/spaces/new", "/admin/content/spaces"],
    ["/admin/spaces", "/admin"],
    ["/admin/new", "/admin/spaces"],
    ["/admin/sp1/edit", "/admin/spaces"],
    ["/admin/sp1/episodes", "/admin/spaces"],
    ["/admin/sp1/episodes/ep1", "/admin/sp1/episodes"],
    ["/admin/sp1/report/story", "/admin/sp1/report"],
    ["/admin/cubes", "/admin"],
    ["/admin/cubes/print", "/admin/cubes"],
    ["/admin/stories/new", "/admin/stories"],
    ["/admin/stories/s1/edit", "/admin/stories"],
    ["/admin/tags", "/admin"],
  ])("%s → %s", (path, expected) => {
    expect(adminBackFallback(path)).toBe(expected);
  });
});
