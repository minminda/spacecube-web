import { describe, expect, it } from "vitest";
import { DEMO_SPACE_SEEDS } from "@/lib/home/demoSpaceSeeds";
import { isPublicDemoSpace, publicSpaceFilter, spaceUsable } from "./demoSpaces";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CANON_TAGS = new Set(["LP", "디자인", "소품", "음악", "전시", "책", "커피", "패션", "감각 있는", "다시 오고 싶은", "독특한", "따뜻한", "영감 있는", "조용한", "집중되는", "편안한", "대화", "데이트", "산책 중 들르기", "오래 머물기", "저녁", "혼자", "루프탑", "예약제", "작은 공간", "테라스"]);
const CANON_TYPES = new Set(["LP카페", "문화 카페", "복합문화공간", "북카페", "촬영장비", "카페"]);

describe("시연용 공개 가상 공간 판정", () => {
  it("isDemo + demo- 접두어만 공개 가상 공간이다(실제 공간 · 프로토타입은 아니다)", () => {
    expect(isPublicDemoSpace({ isDemo: true, slug: "demo-green-shelf" })).toBe(true);
    expect(isPublicDemoSpace({ isDemo: true, slug: "proto-yeonnam-alley-coffee" })).toBe(false);
    expect(isPublicDemoSpace({ isDemo: false, slug: "demo-looks-real" })).toBe(false);
  });

  it("spaceUsable: 실제 공간과 공개 가상 공간은 쓸 수 있고 프로토타입 가상 공간은 막힌다", () => {
    expect(spaceUsable({ isDemo: false, slug: "aka-coffee-room" })).toBe(true);
    expect(spaceUsable({ isDemo: true, slug: "demo-slide-room" })).toBe(true);
    expect(spaceUsable({ isDemo: true, slug: "proto-x" })).toBe(false);
  });

  it("공개 필터는 isDemo=false 또는 (isDemo=true + demo- 접두어)다", () => {
    expect(publicSpaceFilter()).toEqual({ OR: [{ isDemo: false }, { isDemo: true, slug: { startsWith: "demo-" } }] });
  });
});

describe("시연용 공간 원본(DEMO_SPACE_SEEDS)", () => {
  it("11곳, slug 접두어 demo-, 지역 망원동, 정본 유형 · 태그 3~5개, 사진 파일 존재, 주소 · 지도 없음", () => {
    expect(DEMO_SPACE_SEEDS).toHaveLength(11);
    expect(new Set(DEMO_SPACE_SEEDS.map((s) => s.slug)).size).toBe(11);
    expect(new Set(DEMO_SPACE_SEEDS.map((s) => s.name)).size).toBe(11);
    expect(new Set(DEMO_SPACE_SEEDS.map((s) => s.image)).size).toBe(11);
    for (const s of DEMO_SPACE_SEEDS) {
      expect(s.slug.startsWith("demo-")).toBe(true);
      expect(s.area).toBe("망원동");
      expect(CANON_TYPES.has(s.category)).toBe(true);
      expect(s.tags.length).toBeGreaterThanOrEqual(3);
      expect(s.tags.length).toBeLessThanOrEqual(5);
      for (const t of s.tags) expect(CANON_TAGS.has(t)).toBe(true);
      expect(existsSync(join(process.cwd(), "public", s.image))).toBe(true);
      expect(Object.keys(s)).not.toContain("address");
      expect(Object.keys(s)).not.toContain("mapUrl");
    }
  });
});
