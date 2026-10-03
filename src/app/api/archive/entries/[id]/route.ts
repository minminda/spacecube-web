import { NextResponse } from "next/server";
import { archiveCaller, archiveErrorResponse, readBody } from "@/lib/archive/apiAuth";
import { getArchiveTagOptions, setCoverPhoto, updateEntry } from "@/lib/archive/entries";
import { parsePatchInput } from "@/lib/archive/input";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 내 기록 고치기(이름·지역·한 줄·태그·다시 가고 싶은지·상태·대표 사진). 지우는 동작은 없다. */
export async function PATCH(req: Request, { params }: Ctx) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const { id } = await params;
  const body = (await readBody(req)) as Record<string, unknown> | null;
  try {
    if (typeof body?.coverPhotoId === "string") {
      await setCoverPhoto(caller.userId, id, body.coverPhotoId);
      return NextResponse.json({ ok: true });
    }
    const parsed = parsePatchInput(body, new Set(await getArchiveTagOptions()));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await updateEntry(caller.userId, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return archiveErrorResponse(e);
  }
}
