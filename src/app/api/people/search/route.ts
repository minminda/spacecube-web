import { NextResponse } from "next/server";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { previewDemoUsers } from "@/lib/demoData";
import { searchPeopleTiles } from "@/lib/people/peopleData";

export const dynamic = "force-dynamic";

/**
 * 추천 > 사람 탭의 닉네임 검색 — GET ?q=. 공개 프로필만(기존 사람 찾기와 같은 규칙), 응답은 카드에 필요한 것만
 * (공개 주소 · 이름 · 프로필 이미지 · 아바타 seed). 이메일 · 역할 · 비공개 공간은 담지 않는다. 2자 미만이면 빈 결과.
 */
export async function GET(req: Request) {
  const viewer = await getEditorialViewer();
  if (!viewer.editorial) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const people = await searchPeopleTiles(q, viewer.userId, { includeDemo: previewDemoUsers(viewer.admin) });
  return NextResponse.json({ people: people ?? [] });
}
