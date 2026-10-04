import { NextRequest, NextResponse } from "next/server";
import { archiveCaller } from "@/lib/archive/apiAuth";
import { searchArchiveSpaces } from "@/lib/archive/entries";

export const dynamic = "force-dynamic";

/** 공간 추가 검색 — 공간큐브에 등록된 공간만(이름·지역·주소·유형), 결과마다 내 상태 포함. 외부 검색·자동 생성 없음. */
export async function GET(req: NextRequest) {
  const caller = await archiveCaller();
  if (caller instanceof NextResponse) return caller;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const results = q ? await searchArchiveSpaces(caller.userId, q, { includeDemo: caller.includeDemo }) : [];
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
