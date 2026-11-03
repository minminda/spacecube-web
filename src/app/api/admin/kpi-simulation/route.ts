import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { KPI_SIM_COOKIE, KPI_SIM_MAX_AGE_SEC } from "@/lib/kpiSimulationServer";

export const dynamic = "force-dynamic";

/**
 * 졸업전시 KPI 시뮬레이션 켜기/끄기 — 관리자 전용. 쿠키(12시간 후 자동 해제)만 설정하며
 * DB에는 아무것도 쓰지 않는다. body: { enabled: boolean }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled(boolean) required" }, { status: 400 });
  }
  const res = NextResponse.json({ enabled: body.enabled });
  if (body.enabled) {
    res.cookies.set(KPI_SIM_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: KPI_SIM_MAX_AGE_SEC });
  } else {
    res.cookies.set(KPI_SIM_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}
