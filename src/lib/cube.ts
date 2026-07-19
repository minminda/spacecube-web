import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/config";
import { normalizeCubeCode, buildCubeUrl } from "@/lib/cubeUrl";

export { normalizeCubeCode, buildCubeUrl };

/** 서버 전용 — 현재 앱 기준 URL로 큐브 URL을 바로 만든다 */
export function getCubeUrl(code: string): string {
  return buildCubeUrl(getBaseUrl(), code);
}

export type CubeWithSpace = {
  id: string;
  status: "UNASSIGNED" | "ASSIGNED" | "DISABLED";
  spaceId: string | null;
  space: { id: string; slug: string } | null;
};

export async function getCubeByCode(code: string): Promise<CubeWithSpace | null> {
  return prisma.cube.findUnique({
    where: { code: normalizeCubeCode(code) },
    select: { id: true, status: true, spaceId: true, space: { select: { id: true, slug: true } } },
  });
}

export type CubeDestination =
  | { type: "not_found" }
  | { type: "disabled" }
  | { type: "unassigned" }
  | { type: "redirect"; slug: string };

/**
 * 큐브 상태로부터 방문자가 가야 할 곳을 결정하는 순수 함수. status가 ASSIGNED인데
 * space가 없는 경우(데이터 정합성이 깨진 예외 상황)도 서버 에러 없이 "미연결"로 안전하게
 * 처리한다.
 */
export function resolveCubeDestination(cube: CubeWithSpace | null): CubeDestination {
  if (!cube) return { type: "not_found" };
  if (cube.status === "DISABLED") return { type: "disabled" };
  if (cube.status === "ASSIGNED" && cube.space) return { type: "redirect", slug: cube.space.slug };
  return { type: "unassigned" };
}
