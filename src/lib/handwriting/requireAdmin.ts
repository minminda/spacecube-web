/** EXPERIMENTAL ONLY — 손글씨 PoC API 라우트 공용 인가 체크. 기존 isAdmin 재사용, 새 권한 체계 없음. */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_HANDWRITING_POC } from "@/lib/handwriting/features";

export async function requireHandwritingAdmin(req?: NextRequest): Promise<NextResponse | null> {
  if (!ENABLE_HANDWRITING_POC) {
    return NextResponse.json({ error: "실험 기능이 비활성화되어 있습니다." }, { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    // 진단용 — 토큰 값은 절대 남기지 않고, 쿠키가 "아예 안 왔는지" vs "왔는데 세션이
    // 무효인지"만 구분한다. 원인 파악되면 이 로그는 제거할 것.
    const cookieNames = req ? [...req.cookies.getAll()].map((c) => c.name) : [];
    console.log("[handwriting-auth] denied", {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email ?? null,
      cookieNames,
    });
    return NextResponse.json(
      { error: "로그인이 만료됐거나 관리자 권한이 없습니다. 다시 로그인해주세요.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
  }
  return null;
}
