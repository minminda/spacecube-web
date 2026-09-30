import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import LegacyHome from "./LegacyHome";
import EditorialHome from "./EditorialHome";

interface Props {
  searchParams: Promise<{ legacy?: string }>;
}

/**
 * 홈 — 에디토리얼 홈 공개(ENABLE_EDITORIAL_HOME) 전까지는 관리자만 새 홈을 미리 본다.
 * 관리자가 기존 홈을 확인하려면 /?legacy=1.
 */
export default async function Home({ searchParams }: Props) {
  const [session, { legacy }] = await Promise.all([auth(), searchParams]);
  const admin = isAdmin(session?.user?.email);
  const editorial = ENABLE_EDITORIAL_HOME || admin;

  if (editorial && !(admin && legacy === "1")) {
    return <EditorialHome admin={admin} />;
  }
  return <LegacyHome session={session} />;
}
