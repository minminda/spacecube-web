/** EXPERIMENTAL ONLY — 손글씨 PoC API 라우트 공용 인가 체크. 기존 isAdmin 재사용, 새 권한 체계 없음. */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_HANDWRITING_POC } from "@/lib/handwriting/features";

export async function requireHandwritingAdmin(): Promise<NextResponse | null> {
  if (!ENABLE_HANDWRITING_POC) {
    return NextResponse.json({ error: "실험 기능이 비활성화되어 있습니다." }, { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
