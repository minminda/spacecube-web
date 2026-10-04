import { describe, it, expect } from "vitest";
import {
  PREVIEW_PLACEHOLDER, curationArticleFromDraft, curationEyebrowLine, draftBlocks, peopleEyebrow, storyArticleFromDraft, thoughtEyebrow,
  type DraftInput,
} from "./draftView";
import type { SpaceView } from "./types";

const IMG = "https://res.cloudinary.com/demo/image/upload/a.jpg";
const space = (id: string, name: string): SpaceView => ({ id, slug: id, name, area: "연남동", category: "독립서점", coverImage: IMG, cubeAvailable: true, status: "PUBLISHED" });
const views = { s1: space("s1", "북눅 연남"), s2: space("s2", "턴다운서비스"), s3: space("s3", "내면의 발견") };

const base: DraftInput = {
  kind: "thoughts", number: "1", label: "비가 내리던 오후, 작은 서점의 창가", title: "왜 어떤 공간은 오래 기억에 남을까", summary: "요약",
  coverImage: IMG, coverPosition: "50% 30%", spaces: [], blocks: [],
};

describe("공개 페이지와 같은 머리줄", () => {
  it("THOUGHT · PEOPLE · CURATION", () => {
    expect(thoughtEyebrow(1, "비 오는 오후")).toBe("THOUGHT 001 · 비 오는 오후");
    expect(thoughtEyebrow(12, null)).toBe("THOUGHT 012");
    expect(peopleEyebrow(2, "민지", "북눅 연남 운영자")).toBe("PEOPLE 002 · 민지 · 북눅 연남 운영자");
    expect(peopleEyebrow(2, null, "운영자")).toBe("PEOPLE 002 · 운영자");
    expect(curationEyebrowLine(3, "SITUATION")).toBe("CURATION 003 · SITUATION · 상황");
    expect(curationEyebrowLine(3, null)).toBe("CURATION 003");
  });
});

describe("STORY 초안 → StoryArticle", () => {
  it("본문 블록(문단·소제목·인용·구분선·이미지+캡션)을 공개 규칙 그대로 넘긴다", () => {
    const blocks = [
      { type: "TEXT", text: "첫 문단" },
      { type: "HEADING", text: "사진보다 오래 남는 것" },
      { type: "QUOTE", text: "좋은 공간보다, 오래 기억되는 시간을", cite: "편집자" },
      { type: "DIVIDER" },
      { type: "IMAGE", image: { url: IMG, caption: "창가 자리" } },
    ];
    const p = storyArticleFromDraft({ ...base, blocks }, views, { placeholders: true });
    expect(p.blocks.map((b) => b.type)).toEqual(["TEXT", "HEADING", "QUOTE", "DIVIDER", "IMAGE"]);
    expect(p.blocks[4]).toMatchObject({ type: "IMAGE", image: { url: IMG, caption: "창가 자리" } });
    expect(p.eyebrow).toBe("THOUGHT 001 · 비가 내리던 오후, 작은 서점의 창가");
    expect(p.cover).toEqual({ src: IMG, alt: base.title, position: "50% 30%" });
    expect(p.spacesLabel).toBe("이 생각이 시작된 공간");
  });
  it("미완성 블록은 공개 화면처럼 빠지고, 빈 소제목·인용은 미리보기에서만 자리 표시", () => {
    const blocks = [{ type: "HEADING", text: "" }, { type: "QUOTE", text: " " }, { type: "IMAGE", image: { url: "" } }, { type: "TEXT", text: "" }];
    expect(draftBlocks(blocks, { placeholders: true }).map((b) => ("text" in b ? b.text : b.type))).toEqual([PREVIEW_PLACEHOLDER.heading, PREVIEW_PLACEHOLDER.quote]);
    expect(draftBlocks(blocks, { placeholders: false })).toEqual([]);
  });
  it("빈 제목·요약·본문은 미리보기 안내 문구 — placeholders가 아니면 절대 넣지 않는다", () => {
    const empty = { ...base, title: "", summary: "", blocks: [] };
    const pv = storyArticleFromDraft(empty, views, { placeholders: true });
    expect(pv.title).toBe(PREVIEW_PLACEHOLDER.title);
    expect(pv.summary).toBe(PREVIEW_PLACEHOLDER.summary);
    expect(pv.blocks).toEqual([{ type: "TEXT", text: PREVIEW_PLACEHOLDER.body }]);
    const pub = storyArticleFromDraft(empty, views, { placeholders: false });
    expect([pub.title, pub.summary, pub.blocks.length]).toEqual(["", "", 0]);
  });
  it("PEOPLE은 인터뷰이·역할이 머리줄에, 관련 공간은 폼 순서·메모 그대로(발행 공간만)", () => {
    const p = storyArticleFromDraft({ ...base, kind: "people", number: "2", label: "민지", subjectRole: "운영자", spaces: [{ spaceId: "s2", note: "" }, { spaceId: "draft-space", note: "x" }, { spaceId: "s1", note: " 운영 중 " }] }, views, { placeholders: true });
    expect(p.eyebrow).toBe("PEOPLE 002 · 민지 · 운영자");
    expect(p.spaces.map((l) => [l.space.name, l.note])).toEqual([["턴다운서비스", undefined], ["북눅 연남", "운영 중"]]);
    expect(p.backLabel).toBe("PEOPLE");
  });
  it("본문 공간 카드는 공개 페이지처럼 그 공간 정보로", () => {
    const p = storyArticleFromDraft({ ...base, blocks: [{ type: "SPACE_CARD", spaceId: "s3", note: "여기서" }] }, views, { placeholders: true });
    expect(p.blockSpaces.get("s3")?.name).toBe("내면의 발견");
  });
});

describe("CURATION 초안 → CurationArticle", () => {
  it("지역·관점·선정 기준·선정 공간 3곳과 이유", () => {
    const d: DraftInput = {
      ...base, kind: "curations", number: "1", label: "연남", perspective: "SITUATION", title: "혼자 오래 머물고 싶은 연남", summary: "혼자 들어가도 어색하지 않은 곳.",
      spaces: [{ spaceId: "s1", note: "예약제로 운영되어" }, { spaceId: "s2", note: "음악" }, { spaceId: "s3", note: "" }], date: "2026.10.04",
    };
    const p = curationArticleFromDraft(d, views, { placeholders: true });
    expect(p.eyebrow).toBe("CURATION 001 · SITUATION · 상황");
    expect(p.area).toBe("연남");
    expect(p.meta).toBe("연남에서 발견한 3개의 공간 · 2026.10.04");
    expect(p.spaces.map((l) => [l.space.name, l.note])).toEqual([["북눅 연남", "예약제로 운영되어"], ["턴다운서비스", "음악"], ["내면의 발견", undefined]]);
    expect(p.blocks).toEqual([]); // 큐레이션은 본문이 없어도 된다(빈 본문 안내 없음)
  });
  it("빈 선정 기준은 미리보기에서만 안내", () => {
    const d: DraftInput = { ...base, kind: "curations", label: "", summary: "", title: "" };
    expect(curationArticleFromDraft(d, views, { placeholders: true }).summary).toBe(PREVIEW_PLACEHOLDER.curationSummary);
    expect(curationArticleFromDraft(d, views, { placeholders: false }).summary).toBe("");
    expect(curationArticleFromDraft(d, views, { placeholders: true }).meta).toBe("공간 0곳");
  });
});
