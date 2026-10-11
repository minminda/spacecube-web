import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import LegacyHome from "./LegacyHome";
import EditorialHome from "./EditorialHome";

interface Props {
  searchParams: Promise<{ legacy?: string; preview?: string; area?: string }>;
}

/**
 * 홈(공간 발견 허브) — 에디토리얼 홈 공개(ENABLE_EDITORIAL_HOME) 전까지는 관리자만 새 홈을 미리 본다.
 * 관리자가 기존 홈을 확인하려면 /?legacy=1. 지역은 /?area=후암.
 *
 * 미리보기는 관리자이거나 로컬 개발 환경(NODE_ENV=development)일 때만 적용된다 — 운영(production)에서 일반 방문자는
 * 이 파라미터를 붙여도 항상 발행본 · 실제 공간만 본다.
 *   /?preview=drafts   초안 콘텐츠 포함
 *   /?preview=fixtures UI 확인용 임시 공간(src/lib/home/fixtures.ts)을 선반에 섞어 본다
 */
export default async function Home({ searchParams }: Props) {
  const [session, { legacy, preview, area }] = await Promise.all([auth(), searchParams]);
  const admin = isAdmin(session?.user?.email);
  const editorial = ENABLE_EDITORIAL_HOME || admin;

  if (editorial && !(admin && legacy === "1")) {
    const previewAllowed = admin || process.env.NODE_ENV === "development";
    return (
      <EditorialHome
        admin={admin}
        previewDrafts={previewAllowed && preview === "drafts"}
        fixtures={previewAllowed && preview === "fixtures"}
        userId={session?.user?.id ?? null}
        area={typeof area === "string" ? area.slice(0, 30) : null}
      />
    );
  }
  return <LegacyHome session={session} />;
}
