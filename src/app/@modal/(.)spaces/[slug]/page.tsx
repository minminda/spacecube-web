import { headers } from "next/headers";
import SpaceDetail from "@/components/editorial/SpaceDetail";
import SpaceDetailModal from "@/components/editorial/SpaceDetailModal";

/**
 * HOME · 검색 · 지역 · 내 공간 등 앱 안에서 카드를 눌렀을 때만 가로채는 상세(데스크톱 창).
 * 주소창 · 새 탭 · 새로고침으로 /spaces/[slug]에 오면 이 라우트는 쓰이지 않고 독립 페이지(app/spaces/[slug])가 뜬다.
 */
export default async function SpaceDetailInterceptedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // 휴대폰은 창을 쓰지 않는다 — 클라이언트가 곧 독립 페이지로 다시 불러오므로 데이터 조회는 건너뛴다
  const mobile = (await headers()).get("sec-ch-ua-mobile") === "?1";
  return <SpaceDetailModal>{mobile ? null : <SpaceDetail slug={slug} presentation="modal" />}</SpaceDetailModal>;
}
