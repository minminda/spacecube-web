import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { ContentItem } from "@/lib/editorial/types";
import { KNOWN_SIZES, latestFit, pickLatest } from "./latestPick";

const item = (key: string, kind: ContentItem["kind"], src: string | null): ContentItem => ({
  key, kind, eyebrow: key, label: key, title: key, href: `/${key}`, image: { src, alt: key }, date: "", status: "PUBLISHED",
});

describe("LATEST 이미지 적합도", () => {
  it("가로형 + 충분한 해상도는 good, 작으면 ok, 세로형 · 정사각형은 poor, 모르면 unknown, 이미지가 없으면 none", () => {
    expect(latestFit("https://x/y/kvhrpngliaytuasuhul3.jpg")).toBe("good");
    expect(latestFit("https://x/y/rmjcx9x8wofg1tsxol0g.jpg")).toBe("good");
    expect(latestFit("/demo/green-shelf.jpg")).toBe("poor");
    expect(latestFit("https://x/y/rjlzpvpy36fldcxxlhrs.jpg")).toBe("poor");
    expect(latestFit("https://x/y/new-upload.jpg")).toBe("unknown");
    expect(latestFit("")).toBe("none");
    expect(latestFit(null)).toBe("none");
  });

  it("실측 표가 public/demo의 실제 파일 크기와 같다", async () => {
    for (const [file, [w, h]] of Object.entries(KNOWN_SIZES)) {
      const path = join(process.cwd(), "public", "demo", file);
      if (!existsSync(path)) continue; // Cloudinary 이미지는 파일이 없다
      const m = await sharp(path).metadata();
      expect([m.width, m.height]).toEqual([w, h]);
    }
  });
});

describe("pickLatest", () => {
  const A = "https://x/a/kvhrpngliaytuasuhul3.jpg"; // good
  const B = "https://x/a/rmjcx9x8wofg1tsxol0g.jpg"; // good
  const C = "https://x/a/c8l0vvqi6qbmkaqfifkc.jpg"; // good
  const P = "/demo/green-shelf.jpg"; // 세로형

  it("세로형 · 이미지 없는 콘텐츠는 최상단에서 빠진다", () => {
    const out = pickLatest([item("p", "curation", P), item("n", "person", null), item("a", "thought", A)], 5);
    expect(out.map((i) => i.key)).toEqual(["a"]);
  });

  it("같은 이미지는 한 번만 — 공간과 콘텐츠가 같은 사진이면 하나만", () => {
    const out = pickLatest([item("c1", "curation", B), item("s1", "space", B), item("t1", "thought", A)], 5);
    expect(out.map((i) => i.key)).toEqual(["c1", "t1"]);
  });

  it("종류가 쏠리지 않는다 — 큐레이션이 연달아 최신이어도 다른 종류가 먼저 섞인다", () => {
    const out = pickLatest([item("c1", "curation", A), item("c2", "curation", B), item("c3", "curation", C), item("p1", "person", "https://x/a/ueaomui9dbawrejjvhwk.jpg"), item("s1", "space", "https://x/a/j67iasptbdir89k3qoah.jpg")], 3);
    expect(new Set(out.map((i) => i.kind)).size).toBe(3);
  });

  it("실측된 가로형이 크기를 모르는 이미지보다 먼저, 모르는 이미지도 배제하지는 않는다", () => {
    const out = pickLatest([item("u", "curation", "https://x/a/unknown-new.jpg"), item("a", "thought", A)], 5);
    expect(out.map((i) => i.key)).toEqual(["a", "u"]);
  });

  it("최근 windowSize개 안에서만 고른다(오래된 콘텐츠를 끌어올리지 않는다)", () => {
    const list = [item("p1", "curation", P), item("p2", "curation", P), item("old", "thought", A)];
    expect(pickLatest(list, 5, 2)).toEqual([]);
  });
});
