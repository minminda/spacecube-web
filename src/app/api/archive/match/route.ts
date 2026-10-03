import { NextRequest, NextResponse } from "next/server";
import { archiveCaller } from "@/lib/archive/apiAuth";
import { findSpaceMatches } from "@/lib/archive/entries";

export const dynamic = "force-dynamic";

/** 공간큐브에 이미 있는 공간 찾기(이름 · 붙여넣은 링크). 외부 페이지는 읽지 않는다. */
export async function GET(req: NextRequest) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const url = req.nextUrl.searchParams.get("url");
  const result = await findSpaceMatches(q, url ? url.slice(0, 1000) : null, { includeDemo: caller.includeDemo });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
