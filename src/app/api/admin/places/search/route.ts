import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { searchKakaoPlaces, searchKakaoRegions } from "@/lib/kakaoLocal";

export const dynamic = "force-dynamic";

/** 관리자 전용 장소 검색 — Kakao Local REST API를 서버에서만 호출한다. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1 || (q.length < 2 && req.nextUrl.searchParams.get("mode") !== "region")) return NextResponse.json({ places: [] });

  try {
    const region = req.nextUrl.searchParams.get("mode") === "region";
    const query = q.slice(0, 80);
    return NextResponse.json({ places: region ? await searchKakaoRegions(query) : await searchKakaoPlaces(query) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NO_KEY") {
      return NextResponse.json({ error: "Kakao REST API 키가 설정되지 않았어요. (KAKAO_REST_API_KEY)" }, { status: 503 });
    }
    return NextResponse.json({ error: "장소 검색에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }
}
