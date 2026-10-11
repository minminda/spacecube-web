import { NextResponse } from "next/server";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { getSavedRegions } from "@/lib/regions/savedRegions";
import { searchForViewer } from "@/lib/search/searchData";

export const dynamic = "force-dynamic";

/**
 * 공간 · 지역 검색 — GET ?q=. 공개된 공간(가상 공간은 관리자 · 로컬 미리보기에서만)만 대상이며,
 * 응답은 카드를 그리는 데 필요한 것만(공간 정보 · 선정 이유 · 저장 여부). 이메일 · 개인 기록은 담지 않는다.
 */
export async function GET(req: Request) {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").slice(0, 40);
  const fixtures = params.get("preview") === "fixtures" && (viewer.admin || process.env.NODE_ENV === "development");
  if (!q.trim()) return NextResponse.json({ q, total: 0, regions: [], spaces: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const regions = await getSavedRegions(viewer.userId);
  const { result } = await searchForViewer({ admin: viewer.admin, userId: viewer.userId, q, regions, fixtures });
  return NextResponse.json(result ?? { q, total: 0, regions: [], spaces: [] }, { headers: { "Cache-Control": "private, no-store" } });
}
