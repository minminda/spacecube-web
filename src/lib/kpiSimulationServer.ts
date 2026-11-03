import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildSimulatedScans, SIM_EXCLUDED_SPACE_NAMES, type SimulatedSpaceScans } from "@/lib/kpiSimulation";

/** 시연 모드 쿠키 — 켜는 것은 관리자 전용 API(/api/admin/kpi-simulation)만 한다. URL 파라미터로는 켤 수 없다. */
export const KPI_SIM_COOKIE = "sc_kpi_sim";
export const KPI_SIM_MAX_AGE_SEC = 12 * 60 * 60;

/**
 * 시연 모드가 켜져 있으면 시뮬레이션 데이터, 아니면 null. 쿠키만으로는 부족하고 매번
 * "현재 세션이 관리자인지"를 다시 확인한다 — 쿠키를 위조해도 관리자가 아니면 항상 실데이터.
 * 아무것도 DB에 쓰지 않는다(공간 목록 읽기만).
 */
export async function getKpiSimulation(): Promise<{ spaces: SimulatedSpaceScans[]; excludedNames: string[] } | null> {
  const store = await cookies();
  if (store.get(KPI_SIM_COOKIE)?.value !== "1") return null;
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return null;

  const spaces = await prisma.space.findMany({
    where: { isActive: true, isDemo: false, name: { notIn: SIM_EXCLUDED_SPACE_NAMES } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  return { spaces: buildSimulatedScans(spaces, new Date()), excludedNames: SIM_EXCLUDED_SPACE_NAMES };
}

export async function isKpiSimulationRequested(): Promise<boolean> {
  return (await cookies()).get(KPI_SIM_COOKIE)?.value === "1";
}
