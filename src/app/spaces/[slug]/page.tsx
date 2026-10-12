import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import SpaceDetail from "@/components/editorial/SpaceDetail";
import SpaceDetailModal from "@/components/editorial/SpaceDetailModal";
import Home from "@/app/page";
import { getSpaceBySlug } from "@/lib/editorial/queries";
import { MODAL_RESTORE_COOKIE, shouldRestoreModal } from "@/lib/editorial/modalRestore";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSpaceBySlug(slug);
  if (!s) return { robots: { index: false } };
  return { title: `${s.name} — 공간큐브`, description: s.summary ?? `${s.area} · ${s.category}` };
}

/**
 * 공개 SPACE 상세 독립 페이지 — 주소창 · 새 탭 · 외부 링크 · 휴대폰. 내용은 SpaceDetail(데스크톱 창과 공용).
 * 예외: 데스크톱에서 상세 창이 열린 채 새로고침 · 뒤로/앞으로로 다시 온 요청이면(짧은 쿠키, modalRestore.ts)
 * HOME 위에 같은 상세 창을 그린다 — 주소는 그대로 /spaces/[slug].
 */
export default async function SpaceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const mobile = h.get("sec-ch-ua-mobile") === "?1";
  if (!mobile && shouldRestoreModal(jar.get(MODAL_RESTORE_COOKIE)?.value, slug)) {
    return (
      <>
        <Home searchParams={Promise.resolve({})} />
        <SpaceDetailModal restored>
          <SpaceDetail slug={slug} presentation="modal" />
        </SpaceDetailModal>
      </>
    );
  }
  return <SpaceDetail slug={slug} presentation="page" />;
}
