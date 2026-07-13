import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import type { Space } from "@prisma/client";

/**
 * 공간 접근 가능 여부 판정 — 관리자는 전체, 그 외엔 본인이 ownerId로 연결된 공간만.
 * 레포에 기존에 ownerId 기반 인가 체크가 전혀 없었어서(전부 isAdmin만 확인) /operator에서 새로 만든 규칙.
 */
export function canAccessSpace(userId: string, spaceOwnerId: string | null, isAdminFlag: boolean): boolean {
  if (isAdminFlag) return true;
  return spaceOwnerId != null && spaceOwnerId === userId;
}

/** 로그인 사용자가 담당하는 공간 목록 — 관리자면 전체, 아니면 ownerId가 본인인 공간만. */
export async function resolveOperatorSpaces(userId: string, userEmail: string | null | undefined): Promise<Space[]> {
  if (isAdmin(userEmail)) {
    return prisma.space.findMany({ orderBy: { createdAt: "desc" } });
  }
  return prisma.space.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
}

export type SpaceAccessResult =
  | { ok: true; space: Space; isAdminUser: boolean }
  | { ok: false; status: 404 | 403 };

/**
 * 모든 operator API가 공유하는 서버측 재검증 — 클라이언트가 준 spaceId를 그대로 믿지 않는다.
 */
export async function requireSpaceAccess(
  userId: string,
  userEmail: string | null | undefined,
  spaceId: string,
): Promise<SpaceAccessResult> {
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) return { ok: false, status: 404 };

  const isAdminUser = isAdmin(userEmail);
  if (!canAccessSpace(userId, space.ownerId, isAdminUser)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, space, isAdminUser };
}
