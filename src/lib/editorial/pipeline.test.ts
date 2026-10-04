import { describe, it, expect } from "vitest";
import {
  compareBacklog, effectiveStage, filterBacklog, isOverdue, parseBacklogFilter, parseReferenceLinks, publishMissing,
  stageChange, stageForStatus, type ReadinessInput,
} from "./pipeline";
import { parseCurationInput, parseIdeaInput, parsePersonInput, parseScheduledAt, parseStage } from "./input";
import { orderLatest, latestKey } from "./latest";

const IMG = "https://res.cloudinary.com/demo/image/upload/a.jpg";
const story: ReadinessInput = { kind: "people", title: "제목", summary: "한 줄 소개", coverImage: IMG, spaceCount: 0 };
const curation: ReadinessInput = { kind: "curations", title: "혼자 오래 머물고 싶은 연남", summary: "기준", coverImage: IMG, spaceCount: 3, area: "연남" };

describe("발행 완성 조건", () => {
  it("STORY는 제목·한 줄 소개·대표 이미지(공간 0곳 허용)", () => {
    expect(publishMissing(story)).toEqual([]);
    expect(publishMissing({ ...story, summary: " ", coverImage: null })).toEqual(["한 줄 소개", "대표 이미지"]);
  });
  it("CURATION은 지역·포함 공간 1곳 이상까지", () => {
    expect(publishMissing(curation)).toEqual([]);
    expect(publishMissing({ ...curation, area: null, spaceCount: 0, summary: "" })).toEqual(["한 줄 선정 기준", "지역", "포함 공간(1곳 이상)"]);
  });
});

describe("단계 이동 ↔ 공개 상태", () => {
  const draft = { stage: "IDEA" as const, status: "DRAFT" as const, publishedAt: null };
  const now = new Date("2026-10-04T03:00:00Z");

  it("아이디어 단계에서는 아무것도 강제하지 않고 건너뛸 수 있다", () => {
    const r = stageChange(draft, "REVIEW", { ...story, title: "", summary: "", coverImage: null });
    expect(r).toEqual({ ok: true, data: { stage: "REVIEW", status: "DRAFT" } });
  });
  it("발행은 완성 조건을 통과해야 하고, 통과하면 공개 + 최초 발행일 기록", () => {
    expect(stageChange(draft, "PUBLISHED", { ...story, coverImage: null }).ok).toBe(false);
    expect(stageChange(draft, "PUBLISHED", story, now)).toEqual({ ok: true, data: { stage: "PUBLISHED", status: "PUBLISHED", publishedAt: now } });
  });
  it("재발행은 최초 발행일을 유지한다(LATEST 순서가 재발행으로 바뀌지 않음)", () => {
    const first = new Date("2026-09-01T00:00:00Z");
    const r = stageChange({ stage: "REVIEW", status: "DRAFT", publishedAt: first }, "PUBLISHED", story, now);
    expect(r.ok && r.data).toEqual({ stage: "PUBLISHED", status: "PUBLISHED" });
  });
  it("발행 예약은 완성 조건 + 발행 예정일", () => {
    expect(stageChange(draft, "SCHEDULED", story).ok).toBe(false);
    expect(stageChange(draft, "SCHEDULED", { ...story, scheduledAt: now })).toEqual({ ok: true, data: { stage: "SCHEDULED", status: "DRAFT" } });
  });
  it("발행 중에 다른 단계로 옮기면 공개에서 내린다", () => {
    const r = stageChange({ stage: "PUBLISHED", status: "PUBLISHED", publishedAt: now }, "REVIEW", story);
    expect(r.ok && r.data.status).toBe("DRAFT");
  });
  it("보관된 콘텐츠는 단계를 옮길 수 없다", () => {
    expect(stageChange({ stage: "PRODUCING", status: "ARCHIVED", publishedAt: null }, "REVIEW", story).ok).toBe(false);
  });
  it("기존 상태 버튼과 단계 동기화", () => {
    expect(stageForStatus("PUBLISHED", "PRODUCING")).toBe("PUBLISHED");
    expect(stageForStatus("DRAFT", "PUBLISHED")).toBe("REVIEW");
    expect(stageForStatus("ARCHIVED", "IDEA")).toBe("IDEA");
  });
  it("화면 단계는 공개 상태가 우선(발행은 실제 공개 중일 때만)", () => {
    expect(effectiveStage("PRODUCING", "PUBLISHED")).toBe("PUBLISHED");
    expect(effectiveStage("PUBLISHED", "DRAFT")).toBe("REVIEW");
    expect(effectiveStage("IDEA", "ARCHIVED")).toBeNull();
  });
});

describe("백로그", () => {
  const d = (s: string) => new Date(s);
  const items = [
    { kind: "people" as const, title: "북눅 운영자", stage: "IDEA" as const, priority: "LOW" as const, scheduledAt: null, updatedAt: d("2026-10-01") },
    { kind: "curations" as const, title: "혼자 연남", stage: "PRODUCING" as const, priority: "HIGH" as const, scheduledAt: null, updatedAt: d("2026-09-01") },
    { kind: "thoughts" as const, title: "기억에 남는 공간", stage: "SCHEDULED" as const, priority: "HIGH" as const, scheduledAt: d("2026-10-10"), updatedAt: d("2026-09-02") },
    { kind: "people" as const, title: "발행된 글", stage: "PUBLISHED" as const, priority: "HIGH" as const, scheduledAt: null, updatedAt: d("2026-10-03") },
  ];
  it("정렬: 발행 전 → 우선순위 → 예정일 빠른 순 → 최근 수정", () => {
    expect([...items].sort(compareBacklog).map((i) => i.title)).toEqual(["기억에 남는 공간", "혼자 연남", "북눅 운영자", "발행된 글"]);
  });
  it("단계·유형·제목 필터", () => {
    expect(filterBacklog(items, parseBacklogFilter({ type: "PEOPLE" })).length).toBe(2);
    expect(filterBacklog(items, parseBacklogFilter({ stage: "IDEA", type: "PEOPLE" })).map((i) => i.title)).toEqual(["북눅 운영자"]);
    expect(filterBacklog(items, parseBacklogFilter({ q: "연남" })).map((i) => i.title)).toEqual(["혼자 연남"]);
    expect(parseBacklogFilter({ stage: "NOPE", type: "x" })).toEqual({ stage: "ALL", type: "ALL", q: "" });
  });
  it("예정일 지남 표시는 SCHEDULED만", () => {
    const now = d("2026-10-11");
    expect(isOverdue("SCHEDULED", d("2026-10-10"), now)).toBe(true);
    expect(isOverdue("REVIEW", d("2026-10-10"), now)).toBe(false);
    expect(isOverdue("SCHEDULED", null, now)).toBe(false);
  });
  it("참고 링크는 http(s)만, 중복 제거", () => {
    expect(parseReferenceLinks("https://a.com\nhttps://a.com  javascript:x\nhttp://b.kr")).toEqual(["https://a.com", "http://b.kr"]);
  });
});

describe("입력 검증 — 제작 관리 · 아이디어", () => {
  const base = { slug: "x", number: 1, title: "제목", blocks: [], spaces: [] };
  it("요약은 저장 때 비워도 된다(발행 때 필수)", () => {
    const r = parsePersonInput({ ...base, summary: "" });
    expect(r.ok && r.data.summary).toBe("");
  });
  it("제작 관리 필드와 인터뷰이", () => {
    const r = parsePersonInput({ ...base, priority: "HIGH", assignee: " 민지 ", scheduledAt: "2026-10-10", referenceLinks: ["https://instagram.com/x"], subjectRole: "운영자", subjectLink: "https://instagram.com/x", instagramSummary: "캡션" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.priority).toBe("HIGH");
    expect(r.data.assignee).toBe("민지");
    expect(r.data.scheduledAt?.toISOString()).toBe("2026-10-09T15:00:00.000Z"); // KST 자정
    expect(r.data.subjectRole).toBe("운영자");
    expect(parsePersonInput({ ...base, priority: "URGENT" }).ok).toBe(false);
    expect(parsePersonInput({ ...base, subjectLink: "not a url" }).ok).toBe(false);
  });
  it("기존 큐레이션 입력은 그대로 통과(기본 우선순위 보통)", () => {
    const r = parseCurationInput({ ...base, summary: "요약", area: "연남" });
    expect(r.ok && r.data.priority).toBe("MEDIUM");
  });
  it("아이디어는 유형과 제목만 필수", () => {
    expect(parseIdeaInput({ kind: "people", title: "  " }).ok).toBe(false);
    expect(parseIdeaInput({ kind: "space", title: "a" }).ok).toBe(false);
    const r = parseIdeaInput({ kind: "curations", title: "혼자 연남", referenceLinks: ["https://x.com"] });
    expect(r.ok && r.data).toEqual({ kind: "curations", title: "혼자 연남", internalNote: null, referenceLinks: ["https://x.com"], priority: "MEDIUM", assignee: null });
  });
  it("단계 값·예정일 형식", () => {
    expect(parseStage({ stage: "REVIEW" }).ok).toBe(true);
    expect(parseStage({ stage: "DONE" }).ok).toBe(false);
    expect(parseScheduledAt("")).toBeNull();
  });
});

describe("LATEST 정렬", () => {
  const row = (item: string, publishedAt: string | null, createdAt: string, updatedAt = createdAt) => ({
    ...latestKey({ publishedAt: publishedAt ? new Date(publishedAt) : null, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) }), item,
  });
  it("STORY·CURATION을 섞어 publishedAt DESC, 같은 시각은 등록 순", () => {
    const rows = [
      row("curation-old", "2026-09-01", "2026-08-01"),
      row("people-new", "2026-10-03", "2026-09-20"),
      row("thought-same-b", "2026-10-02", "2026-09-11"),
      row("thought-same-a", "2026-10-02", "2026-09-10"),
    ];
    expect(orderLatest(rows)).toEqual(["people-new", "thought-same-a", "thought-same-b", "curation-old"]);
  });
});
