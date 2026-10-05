import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import EdImage from "@/components/editorial/EdImage";
import PageHeader from "@/components/editorial/PageHeader";
import PartnerMark from "@/components/editorial/PartnerMark";
import SiteFooter from "@/components/editorial/SiteFooter";
import TabLinks from "@/components/editorial/TabLinks";
import { getEditorialViewer } from "@/lib/editorial/viewer";
import { listContentStream } from "@/lib/editorial/queries";
import { CONTENT_KIND_LABEL, type ContentItem } from "@/lib/editorial/types";

export const metadata: Metadata = {
  title: "LATEST — 공간큐브",
  description: "새롭게 기록한 공간과 이야기를 만나보세요.",
};

interface Props {
  searchParams: Promise<{ type?: string; n?: string }>;
}

const PAGE = 24;
const FILTERS = {
  story: (i: ContentItem) => i.kind === "person" || i.kind === "thought",
  curation: (i: ContentItem) => i.kind === "curation",
  space: (i: ContentItem) => i.kind === "space",
} as const;
type FilterKey = keyof typeof FILTERS;

/**
 * LATEST — 별도 콘텐츠 타입이 아니라, 공간큐브에 새로 올라온 것(STORY · CURATION · 새로 공개된 SPACE)을 한 줄로 모은 피드.
 * 홈 LATEST 슬라이더와 같은 스트림(listContentStream: 발행본만, 최신 발행 순)을 그대로 쓴다 — 가짜 피드 없음.
 * SNS 피드가 아니라 에디토리얼 목록: 카드 박스 없이 구분선·타이포로만 나눈다.
 * 공개 정책은 다른 새 정보구조 화면과 같다(ENABLE_EDITORIAL_HOME 또는 관리자 미리보기).
 */
export default async function LatestPage({ searchParams }: Props) {
  const [viewer, sp] = await Promise.all([getEditorialViewer(), searchParams]);
  if (!viewer.editorial) redirect("/");

  const type: FilterKey | null = sp.type && sp.type in FILTERS ? (sp.type as FilterKey) : null;
  const limit = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 300);
  const all = await listContentStream();
  const items = type ? all.filter(FILTERS[type]) : all;
  const shown = items.slice(0, limit);

  const tabs = [
    { key: "all", label: "ALL", href: "/latest" },
    { key: "story", label: "STORY", href: "/latest?type=story" },
    { key: "curation", label: "CURATION", href: "/latest?type=curation" },
    { key: "space", label: "SPACE", href: "/latest?type=space" },
  ];
  const moreHref = `/latest?${new URLSearchParams({ ...(type ? { type } : {}), n: String(limit + PAGE) })}`;

  return (
    <div className="editorial-bleed">
      <main className="pb-20 md:pb-28">
        <PageHeader label="Latest" title="LATEST" description="새롭게 기록한 공간과 이야기를 만나보세요." />
        <div className="ed-container pt-6 md:pt-8" style={{ borderBottom: "1px solid var(--ed-line)" }}>
          <TabLinks tabs={tabs} active={type ?? "all"} label="LATEST 유형" />
        </div>

        <section className="ed-container pt-4 md:pt-6">
          {shown.length === 0 ? (
            <p className="text-base py-10" style={{ color: "var(--ed-dim)" }}>새로운 이야기를 준비하고 있어요.</p>
          ) : (
            <ul>
              {shown.map((it, i) => (
                <li key={it.key} style={{ borderBottom: "1px solid var(--ed-line)" }}>
                  <Link href={it.href} className="group grid grid-cols-[1fr_104px] md:grid-cols-[140px_1fr_240px] gap-4 md:gap-10 py-6 md:py-8 items-start">
                    <div className="hidden md:block space-y-1.5 pt-1">
                      <p className="ed-label">{CONTENT_KIND_LABEL[it.kind]}</p>
                      {it.date && <p className="text-xs tabular-nums" style={{ color: "var(--ed-dim)" }}>{it.date}</p>}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <p className="md:hidden ed-label">
                        {CONTENT_KIND_LABEL[it.kind]}
                        {it.date && <span className="ml-2 tabular-nums font-normal" style={{ color: "var(--ed-dim)" }}>{it.date}</span>}
                      </p>
                      {it.eyebrow && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{it.eyebrow}</p>}
                      <p className="flex items-center gap-2 text-lg md:text-2xl font-bold leading-snug tracking-tight break-keep group-hover:underline underline-offset-4">
                        {it.title}
                        {it.partner && <PartnerMark size={16} />}
                      </p>
                      {it.summary && <p className="text-sm leading-relaxed line-clamp-2 break-keep" style={{ color: "var(--ed-dim)" }}>{it.summary}</p>}
                      {it.meta && <p className="text-xs" style={{ color: "var(--ed-dim)" }}>{it.meta}</p>}
                    </div>
                    <EdImage image={it.image} ratio="4 / 3" sizes="(min-width: 768px) 240px, 104px" priority={i < 2} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {items.length > limit && (
            <div className="pt-8 text-center">
              <Link href={moreHref} scroll={false} className="inline-flex items-center h-10 px-5 text-sm" style={{ border: "1px solid var(--ed-line)" }}>
                더 보기 <span className="ml-2 tabular-nums" style={{ color: "var(--ed-dim)" }}>{items.length - limit}</span>
              </Link>
            </div>
          )}
        </section>
      </main>
      <SiteFooter admin={viewer.admin} />
    </div>
  );
}
