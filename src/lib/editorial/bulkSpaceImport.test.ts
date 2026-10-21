import { describe, expect, it } from "vitest";
import { extractEntries, planImport, summarize, withUploadedImages } from "./bulkSpaceImport";

const ctx = {
  existing: [{ slug: "bookNook", name: "북눅 연남" }, { slug: "booknook", name: "북눅 연남" }],
  areas: ["연남동", "망원동"],
  types: ["서점", "카페"],
  tags: ["책", "조용한", "혼자 가기 좋은", "커피", "LP"],
  allowNew: false,
};
const good = (o: Record<string, unknown> = {}) => ({
  slug: "new-shop", name: "새 서점", area: "연남", category: "서점", coverImage: "https://x.test/a.jpg",
  summary: "한 줄", tags: ["책", "조용한", "혼자 가기 좋은"], ...o,
});

describe("extractEntries", () => {
  it("배열 · { spaces } 허용, 빈 입력 거부", () => {
    expect(extractEntries([good()]).ok).toBe(true);
    expect(extractEntries({ spaces: [good()] }).ok).toBe(true);
    expect(extractEntries([]).ok).toBe(false);
    expect(extractEntries({}).ok).toBe(false);
  });
});

describe("planImport", () => {
  it("정상 항목은 등록, 지역은 정본 표기로, cubeAvailable=false", () => {
    const [p] = planImport([good()], ctx);
    expect(p.status).toBe("create");
    expect(p.data?.area).toBe("연남동");
    expect(p.data?.cubeAvailable).toBe(false);
    expect(p.data?.story).toEqual([]);
  });
  it("Episode · Cube 같은 필드는 오류", () => {
    const [p] = planImport([good({ episodes: [], cubeAvailable: true })], ctx);
    expect(p.status).toBe("error");
    expect(p.errors.join()).toContain("episodes");
  });
  it("필수(대표 이미지 · 한 줄 소개 · 태그 3~5)", () => {
    expect(planImport([good({ coverImage: undefined })], ctx)[0].status).toBe("error");
    expect(planImport([good({ summary: "" })], ctx)[0].status).toBe("error");
    expect(planImport([good({ tags: ["책", "조용한"] })], ctx)[0].status).toBe("error");
    expect(planImport([good({ tags: ["책", "조용한", "혼자 가기 좋은", "커피", "LP", "책2"] })], ctx)[0].status).toBe("error");
  });
  it("정본에 없는 지역 · 유형 · 태그는 오류, allowNew면 유형 · 태그만 경고", () => {
    expect(planImport([good({ area: "제주" })], ctx)[0].status).toBe("error");
    expect(planImport([good({ category: "공방" })], ctx)[0].status).toBe("error");
    expect(planImport([good({ tags: ["책", "조용한", "신규태그"] })], ctx)[0].status).toBe("error");
    const r = planImport([good({ category: "공방", tags: ["책", "조용한", "신규태그"] })], { ...ctx, allowNew: true })[0];
    expect(r.status).toBe("create");
    expect(r.warnings.length).toBe(2);
    expect(planImport([good({ area: "제주" })], { ...ctx, allowNew: true })[0].status).toBe("error");
  });
  it("태그는 정본 표기로 통일, 공백/대소문자 차이 허용", () => {
    const [p] = planImport([good({ tags: ["책", "조용한", "혼자가기좋은"] })], ctx);
    expect(p.data?.tags).toEqual(["책", "조용한", "혼자 가기 좋은"]);
  });
  it("파일 내부 slug · 이름 중복", () => {
    const r = planImport([good(), good({ slug: "other" }), good({ name: "다른 이름" })], ctx);
    expect(r[0].status).toBe("create");
    expect(r[1].status).toBe("error"); // 이름 중복
    expect(r[2].status).toBe("error"); // slug 중복
  });
  it("DB 중복: 같은 slug+이름은 건너뜀(재실행 안전), 다른 공간과 겹치면 오류, 이름만 같아도 오류", () => {
    expect(planImport([good({ slug: "booknook", name: "북눅 연남" })], ctx)[0].status).toBe("skip");
    expect(planImport([good({ slug: "booknook", name: "다른" })], ctx)[0].status).toBe("error");
    expect(planImport([good({ slug: "fresh", name: "북눅  연남" })], ctx)[0].status).toBe("error");
  });
  it("fictional → 표시, 로컬 이미지 경로 수집 후 업로드 URL로 치환", () => {
    const [p] = planImport([good({ coverImage: "images/a.jpg", images: ["images/b.jpg"], fictional: true })], ctx);
    expect(p.status).toBe("create");
    expect(p.fictional).toBe(true);
    expect(p.localImages).toEqual(["images/a.jpg", "images/b.jpg"]);
    const d = withUploadedImages(p.data!, new Map([["images/a.jpg", "https://c/a"], ["images/b.jpg", "https://c/b"]]));
    expect(d.coverImage).toBe("https://c/a");
    expect(d.images).toEqual(["https://c/b"]);
  });
  it("summarize", () => {
    const r = planImport([good(), good({ slug: "x2", name: "둘", fictional: true }), good({ slug: "e", name: "셋", area: "제주" })], ctx);
    expect(summarize(r)).toEqual({ total: 3, create: 2, skip: 0, error: 1, fictional: 1 });
  });
});
