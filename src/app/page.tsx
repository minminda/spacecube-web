import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import LegacyHome from "./LegacyHome";
import EditorialHome from "./EditorialHome";

interface Props {
  searchParams: Promise<{ legacy?: string; preview?: string }>;
}

/**
 * 홈 — 에디토리얼 홈 공개(ENABLE_EDITORIAL_HOME) 전까지는 관리자만 새 홈을 미리 본다.
 * 관리자가 기존 홈을 확인하려면 /?legacy=1.
 *
 * 초안 포함 미리보기(/?preview=drafts)는 관리자이거나 로컬 개발 환경(NODE_ENV=development)일 때만
 * 적용된다 — 운영(production)에서 일반 방문자는 이 파라미터를 붙여도 항상 발행본만 본다.
 */
export default async function Home({ searchParams }: Props) {
  const [session, { legacy, preview }] = await Promise.all([auth(), searchParams]);
  const admin = isAdmin(session?.user?.email);
  const editorial = ENABLE_EDITORIAL_HOME || admin;

  if (editorial && !(admin && legacy === "1")) {
    const previewDrafts = preview === "drafts" && (admin || process.env.NODE_ENV === "development");
    return <EditorialHome admin={admin} previewDrafts={previewDrafts} />;
  }
  return <LegacyHome session={session} />;
}
