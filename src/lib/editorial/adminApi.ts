/* ── Editorial CMS 관리자 API 공통(서버 전용) ─────────────────────────────── */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { EditorialStatusValue } from "./types";

/** 관리자가 아니면 401 응답을, 관리자면 null을 반환한다(기존 관리자 API와 같은 규칙). */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Prisma 오류를 사용자 메시지로 — 처리 대상이 아니면 null. */
export function prismaErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = String((e.meta?.target as string[] | string | undefined) ?? "");
      const what = target.includes("number") ? "번호" : "주소(slug)";
      return NextResponse.json({ error: `이미 사용 중인 ${what}예요. 다른 값을 입력해주세요.` }, { status: 409 });
    }
    if (e.code === "P2025") return NextResponse.json({ error: "콘텐츠를 찾을 수 없어요." }, { status: 404 });
    if (e.code === "P2003") return NextResponse.json({ error: "다른 콘텐츠에서 사용 중이라 처리할 수 없어요." }, { status: 409 });
  }
  return null;
}

/** 상태 전환 데이터 — 처음 발행할 때만 publishedAt을 기록한다(이후 발행 취소·재발행해도 최초 발행일 유지). */
export function statusUpdate(next: EditorialStatusValue, currentPublishedAt: Date | null) {
  return next === "PUBLISHED" && !currentPublishedAt ? { status: next, publishedAt: new Date() } : { status: next };
}

/** 존재하지 않는 공간 콘텐츠 id가 있으면 오류 메시지. */
export async function missingSpaceIds(ids: string[]): Promise<string | null> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return null;
  const found = await prisma.editorialSpace.count({ where: { id: { in: unique } } });
  return found === unique.length ? null : "연결한 공간 중 삭제되었거나 존재하지 않는 공간이 있어요. 페이지를 새로고침해주세요.";
}
