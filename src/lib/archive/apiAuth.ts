/* ── 아카이브 API 공통 — 로그인 사용자만, 가상 공간은 관리자·로컬 미리보기에서만 ── */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ArchiveError } from "./entries";
import { isAllowedArchivePhoto } from "./input";

export interface ArchiveCaller {
  userId: string;
  includeDemo: boolean;
}

export async function archiveCaller(): Promise<ArchiveCaller | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return { userId: session.user.id, includeDemo: isAdmin(session.user.email) || process.env.NODE_ENV === "development" };
}

export function archiveErrorResponse(e: unknown): NextResponse {
  if (e instanceof ArchiveError) return NextResponse.json({ error: e.message }, { status: e.status });
  throw e;
}

export async function readBody(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}

/** 저장 API가 받을 사진 주소 판정 — 이 서비스 Cloudinary의 본인 폴더(archive/<userId>/)만. */
export function photoGuard(userId: string) {
  return (url: string) => isAllowedArchivePhoto(url, process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, userId);
}
