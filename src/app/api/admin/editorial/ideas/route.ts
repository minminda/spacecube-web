import { NextResponse } from "next/server";
import { parseIdeaInput } from "@/lib/editorial/input";
import { createIdea } from "@/lib/editorial/pipelineDb";
import { badRequest, readJson, requireAdminApi } from "@/lib/editorial/adminApi";

export const dynamic = "force-dynamic";

/** 백로그 빠른 아이디어 — 해당 종류의 초안을 IDEA 단계로 만든다(제목만 필수). */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const parsed = parseIdeaInput(await readJson(req));
  if (!parsed.ok) return badRequest(parsed.error);
  const created = await createIdea(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
