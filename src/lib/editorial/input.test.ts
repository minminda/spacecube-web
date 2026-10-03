import { describe, it, expect } from "vitest";
import { parseSpaceInput, parseBlocks, parseCurationInput, parsePersonInput, parseThoughtInput, parseStatus, parseHomeInput, collectBlockSpaceIds, readStoredBlocks, readStoredFeed } from "./input";

const IMG = "https://res.cloudinary.com/demo/image/upload/a.jpg";

describe("parseSpaceInput", () => {
  it("필수값과 정규화", () => {
    const r = parseSpaceInput({ slug: " Book Nook ", name: " 북눅 ", area: "연남동", category: "서점", tags: ["책", "책", "혼자"], images: [IMG], cubeAvailable: true, summary: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe("book-nook");
    expect(r.data.name).toBe("북눅");
    expect(r.data.tags).toEqual(["책", "혼자"]);
    expect(r.data.summary).toBeNull();
    expect(r.data.cubeAvailable).toBe(true);
  });
  it("이름 누락/잘못된 URL 거부", () => {
    expect(parseSpaceInput({ slug: "a", area: "x", category: "y" }).ok).toBe(false);
    const bad = parseSpaceInput({ slug: "a", name: "A", area: "x", category: "y", website: "javascript:alert(1)" });
    expect(bad.ok).toBe(false);
  });
  it("cubeAvailable은 true일 때만 true", () => {
    const r = parseSpaceInput({ slug: "a", name: "A", area: "x", category: "y", cubeAvailable: "true" });
    expect(r.ok && r.data.cubeAvailable).toBe(false);
  });
});

describe("parseBlocks", () => {
  it("블록 종류별 검증 + 모르는 필드 제거", () => {
    const r = parseBlocks([
      { type: "TEXT", text: "본문", extra: 1 },
      { type: "HEADING", text: "제목" },
      { type: "IMAGE", image: { url: IMG, caption: "캡션", width: 800.4 } },
      { type: "IMAGE_TEXT", image: { url: IMG }, title: "집", text: "설명", reverse: true },
      { type: "GALLERY", images: [{ url: IMG }, { url: IMG }] },
      { type: "QUOTE", text: "인용" },
      { type: "QNA", items: [{ q: "질문", a: "답" }] },
      { type: "SPACE_CARD", spaceId: "sp1" },
      { type: "DIVIDER" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toHaveLength(9);
    expect(r.data[0]).toEqual({ type: "TEXT", text: "본문" });
    expect(r.data[2]).toEqual({ type: "IMAGE", image: { url: IMG, caption: "캡션", width: 800 } });
    expect(collectBlockSpaceIds(r.data)).toEqual(["sp1"]);
  });
  it("빈 텍스트·알 수 없는 종류·빈 갤러리 거부", () => {
    expect(parseBlocks([{ type: "TEXT", text: "  " }]).ok).toBe(false);
    expect(parseBlocks([{ type: "VIDEO" }]).ok).toBe(false);
    expect(parseBlocks([{ type: "GALLERY", images: [] }]).ok).toBe(false);
    expect(parseBlocks([{ type: "IMAGE", image: { url: "ftp://x" } }]).ok).toBe(false);
  });
  it("저장된 블록 읽기는 손상된 블록만 건너뛴다", () => {
    expect(readStoredBlocks([{ type: "TEXT", text: "a" }, { type: "??" }, { type: "DIVIDER" }])).toHaveLength(2);
    expect(readStoredBlocks("not-array")).toEqual([]);
  });
});

describe("큐레이션/피플", () => {
  const base = { slug: "mullae", number: "3", title: "제목", summary: "요약", blocks: [], spaces: [{ spaceId: "a" }, { spaceId: "b", note: " 메모 " }] };
  it("큐레이션 파싱", () => {
    const r = parseCurationInput({ ...base, area: "문래" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.area).toBe("문래");
    expect(r.data.number).toBe(3);
    expect(r.data.spaces).toEqual([{ spaceId: "a", note: null }, { spaceId: "b", note: "메모" }]);
  });
  it("지역 없는 주제형 큐레이션 허용", () => {
    const r = parseCurationInput({ ...base, area: "  " });
    expect(r.ok && r.data.area).toBeNull();
  });
  it("중복 연결 공간·번호 오류 거부", () => {
    expect(parseCurationInput({ ...base, area: "문래", spaces: [{ spaceId: "a" }, { spaceId: "a" }] }).ok).toBe(false);
    expect(parseCurationInput({ ...base, area: "문래", number: 0 }).ok).toBe(false);
  });
  it("피플은 subject 선택", () => {
    const r = parsePersonInput(base);
    expect(r.ok && r.data.subject).toBeNull();
  });
});

describe("상태/홈", () => {
  it("상태", () => {
    expect(parseStatus({ status: "PUBLISHED" })).toEqual({ ok: true, data: "PUBLISHED" });
    expect(parseStatus({ status: "DELETED" }).ok).toBe(false);
  });
  it("홈 설정", () => {
    const r = parseHomeInput({ heroSpaceId: "s1", featuredCurationId: "", featuredSpaceIds: ["s1", "s2"], feed: [{ kind: "space", id: "s1", headline: "한 줄" }, { kind: "person", id: "p1" }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.featuredCurationId).toBeNull();
    expect(r.data.feed).toHaveLength(2);
    expect(parseHomeInput({ featuredSpaceIds: ["a", "a"] }).ok).toBe(false);
    expect(readStoredFeed([{ kind: "nope", id: "x" }])).toEqual([]);
  });
});

describe("정보 구조 개편(2026-10) 입력", () => {
  const doc = { slug: "a", number: 1, title: "제목", summary: "요약" };
  it("큐레이션 관점 — SITUATION/PURPOSE만, 비우면 null", () => {
    const ok = parseCurationInput({ ...doc, area: "연남", perspective: "SITUATION" });
    expect(ok.ok && ok.data.perspective).toBe("SITUATION");
    const empty = parseCurationInput({ ...doc, perspective: "" });
    expect(empty.ok && empty.data.perspective).toBeNull();
    expect(parseCurationInput({ ...doc, perspective: "RANKING" }).ok).toBe(false);
  });
  it("THOUGHT — 시작 장면은 선택", () => {
    const r = parseThoughtInput({ ...doc, scene: " 비 오는 오후의 서점 " });
    expect(r.ok && r.data.scene).toBe("비 오는 오후의 서점");
    const none = parseThoughtInput(doc);
    expect(none.ok && none.data.scene).toBeNull();
  });
  it("공간 운영자 이야기(story)는 블록으로 검증하고, 없으면 빈 배열", () => {
    const base = { slug: "s", name: "S", area: "연남동", category: "카페" };
    const r = parseSpaceInput({ ...base, story: [{ type: "TEXT", text: "시작" }] });
    expect(r.ok && r.data.story).toEqual([{ type: "TEXT", text: "시작" }]);
    const none = parseSpaceInput(base);
    expect(none.ok && none.data.story).toEqual([]);
    expect(parseSpaceInput({ ...base, story: [{ type: "NOPE" }] }).ok).toBe(false);
  });
});
