/* ── 에디토리얼 홈 서버 헬퍼 ─────────────────────────────────────────────
   공개 여부 판정(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기)만 담당한다.
   홈페이지 콘텐츠(SPACE/CURATION/PEOPLE)는 Editorial CMS(editorial_* 테이블, queries.ts)에서 읽으며,
   Cube 운영 DB(Space/Episode/Scene 등)를 조회하지 않는다. ── */

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";

export interface EditorialViewer {
  loggedIn: boolean;
  /** 로그인 사용자 id(저장 상태 조회용) */
  userId: string | null;
  admin: boolean;
  /** 새 정보구조(홈/CURATION/PEOPLE/SPACE)를 볼 수 있는지 */
  editorial: boolean;
}

export async function getEditorialViewer(): Promise<EditorialViewer> {
  const session = await auth();
  const admin = isAdmin(session?.user?.email);
  return { loggedIn: !!session?.user, userId: session?.user?.id ?? null, admin, editorial: ENABLE_EDITORIAL_HOME || admin };
}
