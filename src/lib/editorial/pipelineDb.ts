/* ── 콘텐츠 제작 파이프라인 — DB 접근(서버 전용) ─────────────────────────────────
   STORY(PEOPLE · THOUGHT)와 CURATION은 기존처럼 각자의 테이블에 그대로 있다(콘텐츠 모델을 합치지 않는다).
   이 모듈은 세 테이블을 같은 "제작 항목"으로 다룬다: 백로그 목록 · 빠른 아이디어 생성 · 단계 이동.
   단계/공개 상태를 맞추는 규칙은 pipeline.ts(순수)에 있다. ── */

import { prisma } from "@/lib/prisma";
import {
  compareBacklog, effectiveStage, publishMissing, stageChange, stageForStatus, type EditorialPriorityValue, type EditorialStageValue,
  type PipelineKind, type StageChange,
} from "./pipeline";
import type { IdeaInput } from "./input";
import type { EditorialStatusValue } from "./types";

const PIPELINE_SELECT = {
  id: true, slug: true, number: true, title: true, summary: true, coverImage: true, status: true, publishedAt: true,
  stage: true, priority: true, assignee: true, scheduledAt: true, updatedAt: true, referenceLinks: true,
  _count: { select: { spaces: true } },
} as const;

interface PipelineRow {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string;
  coverImage: string | null;
  status: EditorialStatusValue;
  publishedAt: Date | null;
  stage: EditorialStageValue;
  priority: EditorialPriorityValue;
  assignee: string | null;
  scheduledAt: Date | null;
  updatedAt: Date;
  referenceLinks: string[];
  _count: { spaces: number };
  area?: string | null;
}

async function findRow(kind: PipelineKind, id: string): Promise<PipelineRow | null> {
  switch (kind) {
    case "curations":
      return prisma.editorialCuration.findUnique({ where: { id }, select: { ...PIPELINE_SELECT, area: true } });
    case "people":
      return prisma.editorialPerson.findUnique({ where: { id }, select: PIPELINE_SELECT });
    case "thoughts":
      return prisma.editorialThought.findUnique({ where: { id }, select: PIPELINE_SELECT });
  }
}

async function updateRow(kind: PipelineKind, id: string, data: { stage: EditorialStageValue; status: EditorialStatusValue; publishedAt?: Date }) {
  switch (kind) {
    case "curations":
      return prisma.editorialCuration.update({ where: { id }, data });
    case "people":
      return prisma.editorialPerson.update({ where: { id }, data });
    case "thoughts":
      return prisma.editorialThought.update({ where: { id }, data });
  }
}

/** 단계 이동(발행 포함) — 완성 조건 검사 후 stage·status·publishedAt을 함께 저장한다. */
export async function applyStage(kind: PipelineKind, id: string, target: EditorialStageValue): Promise<StageChange | null> {
  const row = await findRow(kind, id);
  if (!row) return null;
  const change = stageChange(
    { stage: row.stage, status: row.status, publishedAt: row.publishedAt },
    target,
    { kind, title: row.title, summary: row.summary, coverImage: row.coverImage, spaceCount: row._count.spaces, area: row.area, scheduledAt: row.scheduledAt },
  );
  if (change.ok) await updateRow(kind, id, change.data);
  return change;
}

/** 기존 상태 버튼(발행하기 등)에서 발행할 때도 같은 완성 조건을 적용하기 위한 조회. */
export async function readinessOf(kind: PipelineKind, id: string) {
  const row = await findRow(kind, id);
  if (!row) return null;
  return { stage: row.stage, publishedAt: row.publishedAt, ready: { kind, title: row.title, summary: row.summary, coverImage: row.coverImage, spaceCount: row._count.spaces, area: row.area } };
}

const SLUG_PREFIX: Record<PipelineKind, string> = { curations: "curation", people: "people", thoughts: "thought" };

/**
 * 빠른 아이디어 → 해당 종류의 초안 행(IDEA 단계)을 바로 만든다. 번호는 다음 번호, 주소는 "people-002" 같은 임시 slug
 * (편집 화면에서 바꿀 수 있다). 번호·주소가 동시에 겹치면 몇 번 다시 시도한다.
 */
export async function createIdea(input: IdeaInput): Promise<{ id: string; kind: PipelineKind }> {
  const base = {
    title: input.title, summary: "", status: "DRAFT" as const, stage: "IDEA" as const, priority: input.priority,
    assignee: input.assignee, internalNote: input.internalNote, referenceLinks: input.referenceLinks,
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const agg =
      input.kind === "curations" ? await prisma.editorialCuration.aggregate({ _max: { number: true } })
      : input.kind === "people" ? await prisma.editorialPerson.aggregate({ _max: { number: true } })
      : await prisma.editorialThought.aggregate({ _max: { number: true } });
    const number = (agg._max.number ?? 0) + 1 + attempt;
    const slug = `${SLUG_PREFIX[input.kind]}-${String(number).padStart(3, "0")}${attempt >= 2 ? `-${Date.now().toString(36)}` : ""}`;
    try {
      const data = { ...base, number, slug };
      const row =
        input.kind === "curations" ? await prisma.editorialCuration.create({ data, select: { id: true } })
        : input.kind === "people" ? await prisma.editorialPerson.create({ data, select: { id: true } })
        : await prisma.editorialThought.create({ data, select: { id: true } });
      return { id: row.id, kind: input.kind };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("unreachable");
}

export interface BacklogItem {
  kind: PipelineKind;
  id: string;
  number: number;
  slug: string;
  title: string;
  /** 보관이면 null */
  stage: EditorialStageValue | null;
  status: EditorialStatusValue;
  priority: EditorialPriorityValue;
  assignee: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  spaceCount: number;
  referenceCount: number;
  hasCover: boolean;
}

/** 백로그 — 세 종류를 한 목록으로(보관 제외). 정렬은 compareBacklog. 필터는 화면에서 순수하게 적용한다. */
export async function listBacklog(): Promise<BacklogItem[]> {
  const where = { status: { not: "ARCHIVED" as const } };
  const [curations, people, thoughts] = await Promise.all([
    prisma.editorialCuration.findMany({ where, select: PIPELINE_SELECT }),
    prisma.editorialPerson.findMany({ where, select: PIPELINE_SELECT }),
    prisma.editorialThought.findMany({ where, select: PIPELINE_SELECT }),
  ]);
  const map = (kind: PipelineKind) => (r: PipelineRow): BacklogItem => ({
    kind, id: r.id, number: r.number, slug: r.slug, title: r.title, stage: effectiveStage(r.stage, r.status), status: r.status,
    priority: r.priority, assignee: r.assignee, scheduledAt: r.scheduledAt, publishedAt: r.publishedAt, updatedAt: r.updatedAt,
    spaceCount: r._count.spaces, referenceCount: r.referenceLinks.length, hasCover: !!r.coverImage,
  });
  return [...curations.map(map("curations")), ...people.map(map("people")), ...thoughts.map(map("thoughts"))].sort(compareBacklog);
}

/** 담당자 입력 제안 — 이미 쓰인 담당자 이름(권한 시스템 없이 텍스트로만 관리). */
export async function assigneeSuggestions(): Promise<string[]> {
  const pick = { where: { assignee: { not: null } }, select: { assignee: true }, distinct: ["assignee" as const] };
  const [a, b, c] = await Promise.all([
    prisma.editorialCuration.findMany(pick), prisma.editorialPerson.findMany(pick), prisma.editorialThought.findMany(pick),
  ]);
  return [...new Set([...a, ...b, ...c].map((r) => r.assignee).filter((x): x is string => !!x))].sort((x, y) => x.localeCompare(y, "ko"));
}

/**
 * 기존 상태 버튼 경로(발행하기 · 발행 취소 · 보관 · 복원) — 발행은 단계 이동과 같은 완성 조건을 거치고, stage를 함께 맞춘다.
 * 발행일 규칙은 기존 statusUpdate와 같다(최초 발행 때만 publishedAt 기록).
 */
export async function applyStatus(kind: PipelineKind, id: string, next: EditorialStatusValue): Promise<{ ok: true } | { ok: false; error: string; code: 404 | 400 }> {
  const cur = await readinessOf(kind, id);
  if (!cur) return { ok: false, error: "콘텐츠를 찾을 수 없어요.", code: 404 };
  if (next === "PUBLISHED") {
    const miss = publishMissing(cur.ready);
    if (miss.length) return { ok: false, error: `발행 전에 채워주세요: ${miss.join(", ")}`, code: 400 };
  }
  const data = {
    status: next,
    stage: stageForStatus(next, cur.stage),
    ...(next === "PUBLISHED" && !cur.publishedAt ? { publishedAt: new Date() } : {}),
  };
  switch (kind) {
    case "curations": await prisma.editorialCuration.update({ where: { id }, data }); break;
    case "people": await prisma.editorialPerson.update({ where: { id }, data }); break;
    case "thoughts": await prisma.editorialThought.update({ where: { id }, data }); break;
  }
  return { ok: true };
}
