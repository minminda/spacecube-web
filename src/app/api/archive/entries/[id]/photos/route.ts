import { NextResponse } from "next/server";
import { archiveCaller, archiveErrorResponse, photoGuard, readBody } from "@/lib/archive/apiAuth";
import { addPhotos } from "@/lib/archive/entries";
import { parsePhotos } from "@/lib/archive/input";

export const dynamic = "force-dynamic";

/** 기록에 사진 더하기(방문과 무관한 사진). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  const parsed = parsePhotos(body?.photos, photoGuard(caller.userId));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.data.length === 0) return NextResponse.json({ error: "사진을 골라주세요." }, { status: 400 });
  try {
    await addPhotos(caller.userId, id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}
