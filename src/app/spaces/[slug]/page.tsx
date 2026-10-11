import type { Metadata } from "next";
import SpaceDetail from "@/components/editorial/SpaceDetail";
import { getSpaceBySlug } from "@/lib/editorial/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSpaceBySlug(slug);
  if (!s) return { robots: { index: false } };
  return { title: `${s.name} — 공간큐브`, description: s.summary ?? `${s.area} · ${s.category}` };
}

/** 공개 SPACE 상세 독립 페이지 — 주소창 · 새 탭 · 휴대폰. 내용은 SpaceDetail(데스크톱 창과 공용). */
export default async function SpaceDetailPage({ params }: Props) {
  const { slug } = await params;
  return <SpaceDetail slug={slug} presentation="page" />;
}
