/* ── 콘텐츠 제작 파이프라인(순수 함수) ─────────────────────────────────────────
   STORY(PEOPLE · THOUGHT)와 CURATION을 기획 → 제작 → 검수 → 발행하는 내부 단계.
   - 공개 여부는 여전히 EditorialStatus가 정한다(PUBLISHED만 공개). stage는 팀의 진행 상황이다.
   - 둘을 이 모듈 한 곳에서만 맞춘다: PUBLISHED 단계 ⇔ status PUBLISHED. 다른 단계로 옮기면 발행이 내려간다.
   - 단계는 순서대로 밟지 않아도 된다(THOUGHT·CURATION은 CONTACTING을 건너뛰는 식).
   - 발행(PUBLISHED)과 발행 예약(SCHEDULED)은 "완성 조건"을 통과해야 한다 — 아이디어 단계에서는 아무것도 강제하지 않는다.
   - 자동 발행은 없다(스케줄러를 새로 들이지 않는다). SCHEDULED + scheduledAt은 백로그에서 "예정일 지남"으로 보여준다. ── */

import type { EditorialStatusValue } from "./types";

export const EDITORIAL_STAGES = ["IDEA", "CONTACTING", "PRODUCING", "REVIEW", "SCHEDULED", "PUBLISHED"] as const;
export type EditorialStageValue = (typeof EDITORIAL_STAGES)[number];

export const EDITORIAL_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type EditorialPriorityValue = (typeof EDITORIAL_PRIORITIES)[number];

export const STAGE_LABEL: Record<EditorialStageValue, { ko: string; description: string }> = {
  IDEA: { ko: "아이디어", description: "아이디어만 등록" },
  CONTACTING: { ko: "섭외", description: "섭외·연락 진행(PEOPLE 중심, 필요 없으면 건너뛰기)" },
  PRODUCING: { ko: "제작", description: "인터뷰·글 작성·사진 정리" },
  REVIEW: { ko: "검수", description: "내부 또는 인터뷰이 검수" },
  SCHEDULED: { ko: "발행 예정", description: "완성 · 발행일만 남음" },
  PUBLISHED: { ko: "발행", description: "공개 중" },
};

export const PRIORITY_LABEL: Record<EditorialPriorityValue, string> = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
export const PRIORITY_RANK: Record<EditorialPriorityValue, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** 백로그·편집 화면이 다루는 콘텐츠 종류(관리자 경로 이름과 같다). */
export type PipelineKind = "curations" | "people" | "thoughts";
export const PIPELINE_KIND_LABEL: Record<PipelineKind, string> = { people: "PEOPLE", thoughts: "THOUGHT", curations: "CURATION" };

/**
 * 화면에 보일 단계 — status가 우선한다(혹시 어긋난 행이 있어도 "발행"은 실제 공개 중일 때만 표시).
 * 보관(ARCHIVED)은 단계가 아니라 별도 상태라 null.
 */
export function effectiveStage(stage: EditorialStageValue, status: EditorialStatusValue): EditorialStageValue | null {
  if (status === "ARCHIVED") return null;
  if (status === "PUBLISHED") return "PUBLISHED";
  return stage === "PUBLISHED" ? "REVIEW" : stage;
}

/** 발행·발행 예약 전 완성 조건을 볼 데이터(모든 종류 공통 + 종류별). */
export interface ReadinessInput {
  kind: PipelineKind;
  title: string;
  summary: string;
  coverImage: string | null;
  spaceCount: number;
  /** 큐레이션 지역 */
  area?: string | null;
}

/**
 * 발행에 빠진 것 목록(비었으면 발행 가능).
 * STORY: 제목 · 한 줄 소개 · 대표 이미지. CURATION: + 지역 · 포함 공간 1곳 이상(한 줄 선정 기준 = 요약).
 * 본문은 강제하지 않는다 — 기존 콘텐츠도 블록 없이 요약 중심으로 발행될 수 있었다.
 */
export function publishMissing(d: ReadinessInput): string[] {
  const miss: string[] = [];
  if (!d.title.trim()) miss.push("제목");
  if (!d.summary.trim()) miss.push(d.kind === "curations" ? "한 줄 선정 기준" : "한 줄 소개");
  if (!d.coverImage) miss.push("대표 이미지");
  if (d.kind === "curations") {
    if (!d.area?.trim()) miss.push("지역");
    if (d.spaceCount === 0) miss.push("포함 공간(1곳 이상)");
  }
  return miss;
}

export interface PipelineState {
  stage: EditorialStageValue;
  status: EditorialStatusValue;
  publishedAt: Date | null;
}

export type StageChange =
  | { ok: true; data: { stage: EditorialStageValue; status: EditorialStatusValue; publishedAt?: Date } }
  | { ok: false; error: string };

/**
 * 단계 이동 → 저장할 값. 발행은 처음 발행할 때만 publishedAt을 기록한다(기존 statusUpdate와 같은 규칙 — 재발행해도 최초 발행일 유지,
 * LATEST는 publishedAt DESC라 재발행으로 맨 앞에 다시 끼어들지 않는다).
 */
export function stageChange(cur: PipelineState, target: EditorialStageValue, ready: ReadinessInput & { scheduledAt?: Date | null }, now = new Date()): StageChange {
  if (cur.status === "ARCHIVED") return { ok: false, error: "보관된 콘텐츠예요. 먼저 초안으로 복원해주세요." };
  if (target === "PUBLISHED" || target === "SCHEDULED") {
    const miss = publishMissing(ready);
    if (miss.length) return { ok: false, error: `${target === "PUBLISHED" ? "발행" : "발행 예약"} 전에 채워주세요: ${miss.join(", ")}` };
  }
  if (target === "SCHEDULED" && !ready.scheduledAt) return { ok: false, error: "발행 예정일을 먼저 저장해주세요." };
  if (target === "PUBLISHED") {
    return { ok: true, data: { stage: "PUBLISHED", status: "PUBLISHED", ...(cur.publishedAt ? {} : { publishedAt: now }) } };
  }
  // 발행 중이던 콘텐츠를 다른 단계로 옮기면 공개에서 내린다(초안).
  return { ok: true, data: { stage: target, status: "DRAFT" } };
}

/**
 * 기존 상태 버튼(발행하기 · 발행 취소 · 보관 · 복원)이 쓰는 경로에서 stage를 함께 맞춘다.
 * 발행 → PUBLISHED, 발행 취소 → REVIEW(완성본을 다시 검수), 보관 → 단계 유지, 복원 → 발행 단계였다면 REVIEW.
 */
export function stageForStatus(next: EditorialStatusValue, curStage: EditorialStageValue): EditorialStageValue {
  if (next === "PUBLISHED") return "PUBLISHED";
  if (next === "DRAFT" && curStage === "PUBLISHED") return "REVIEW";
  return curStage;
}

/** 백로그 정렬: 우선순위 높은 것 → 발행 예정일 빠른 것(없으면 뒤) → 최근 수정. 발행된 것은 맨 뒤. */
export interface BacklogSortable {
  stage: EditorialStageValue | null;
  priority: EditorialPriorityValue;
  scheduledAt: Date | null;
  updatedAt: Date;
}
export function compareBacklog(a: BacklogSortable, b: BacklogSortable): number {
  const pub = (x: BacklogSortable) => (x.stage === "PUBLISHED" ? 1 : 0);
  return (
    pub(a) - pub(b) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.scheduledAt?.getTime() ?? Infinity) - (b.scheduledAt?.getTime() ?? Infinity) ||
    b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

/** 발행 예정일이 지났는데 아직 공개되지 않음 — 자동 발행이 없으므로 사람이 눌러야 한다는 표시. */
export function isOverdue(stage: EditorialStageValue | null, scheduledAt: Date | null, now = new Date()): boolean {
  return stage === "SCHEDULED" && !!scheduledAt && scheduledAt.getTime() < now.getTime();
}

/** 참고 링크 입력(줄바꿈·공백 구분) → http(s) 주소만, 중복 제거, 최대 10개. */
export function parseReferenceLinks(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/\s+/) : [];
  const urls = list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\/\S+$/i.test(x) && x.length <= 1000);
  return [...new Set(urls)].slice(0, 10);
}

/* ── 백로그 필터(?stage= &type= &q=) ── */

export type BacklogType = "ALL" | "PEOPLE" | "THOUGHT" | "CURATION";
const TYPE_KIND: Record<Exclude<BacklogType, "ALL">, PipelineKind> = { PEOPLE: "people", THOUGHT: "thoughts", CURATION: "curations" };

export interface BacklogFilter {
  stage: EditorialStageValue | "ALL";
  type: BacklogType;
  q: string;
}

export function parseBacklogFilter(sp: { stage?: string; type?: string; q?: string }): BacklogFilter {
  const stage = (EDITORIAL_STAGES as readonly string[]).includes(sp.stage ?? "") ? (sp.stage as EditorialStageValue) : "ALL";
  const type = sp.type === "PEOPLE" || sp.type === "THOUGHT" || sp.type === "CURATION" ? sp.type : "ALL";
  return { stage, type, q: (sp.q ?? "").trim().slice(0, 60) };
}

/** 단계 · 유형 · 제목 검색(대소문자 무시). 보관(stage null)은 백로그 목록에 처음부터 없다. */
export function filterBacklog<T extends { kind: PipelineKind; stage: EditorialStageValue | null; title: string }>(items: T[], f: BacklogFilter): T[] {
  const q = f.q.toLowerCase();
  return items.filter(
    (i) =>
      (f.stage === "ALL" || i.stage === f.stage) &&
      (f.type === "ALL" || i.kind === TYPE_KIND[f.type]) &&
      (!q || i.title.toLowerCase().includes(q)),
  );
}
