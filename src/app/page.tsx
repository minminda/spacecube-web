import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { ENABLE_EDITORIAL_HOME, ENABLE_PUBLIC_DEMO_SPACES } from "@/lib/features";
import { normalizeArea } from "@/lib/editorial/area";
import { DEMO_REGION, homeHref } from "@/lib/home/shelves";
import LegacyHome from "./LegacyHome";
import EditorialHome from "./EditorialHome";
import { getSavedRegions } from "@/lib/regions/savedRegions";

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
 */
export default async function Home({ searchParams }: Props) {
  const [session, { legacy, preview, area }] = await Promise.all([auth(), searchParams]);
  const admin = isAdmin(session?.user?.email);
  const editorial = ENABLE_EDITORIAL_HOME || admin;

  if (editorial && !(admin && legacy === "1")) {
    // 시연 지역 모드 — 이용 가능한 지역은 망원뿐이다. 기본 지역이 망원이고, 다른 지역을 주소로 직접 넣어도 빈 화면 대신 망원으로 안내한다.
    if (ENABLE_PUBLIC_DEMO_SPACES && typeof area === "string" && area && normalizeArea(area) !== DEMO_REGION) {
      redirect(homeHref({ preview: typeof preview === "string" ? preview : null }));
    }
    const previewAllowed = admin || process.env.NODE_ENV === "development";
    const savedRegions = await getSavedRegions(session?.user?.id ?? null);
    return (
      <EditorialHome
        admin={admin}
        previewDrafts={previewAllowed && preview === "drafts"}
        fixtures={false}
        userId={session?.user?.id ?? null}
        area={typeof area === "string" ? area.slice(0, 30) : null}
        savedRegions={savedRegions}
      />
    );
  }
  return <LegacyHome session={session} />;
}
