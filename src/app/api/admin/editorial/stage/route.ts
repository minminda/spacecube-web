import { NextResponse } from "next/server";
import { parseStage } from "@/lib/editorial/input";
import { applyStage } from "@/lib/editorial/pipelineDb";
import type { PipelineKind } from "@/lib/editorial/pipeline";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

const KINDS: readonly PipelineKind[] = ["curations", "people", "thoughts"];

/** 제작 단계 이동 { kind, id, stage } — PUBLISHED로 옮기면 공개, 발행 중에 다른 단계로 옮기면 공개에서 내린다. */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await readJson(req);
  const o = (body && typeof body === "object" ? body : {}) as { kind?: unknown; id?: unknown };
  if (!KINDS.includes(o.kind as PipelineKind) || typeof o.id !== "string") return badRequest("대상 콘텐츠가 올바르지 않아요.");
  const parsed = parseStage(body);
  if (!parsed.ok) return badRequest(parsed.error);

  const res = await applyStage(o.kind as PipelineKind, o.id, parsed.data);
  if (!res) return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
  if (!res.ok) return badRequest(res.error);
  return NextResponse.json({ ok: true, ...res.data });
}
