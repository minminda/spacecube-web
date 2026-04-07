import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLang } from "@/lib/i18n";
import SpaceCards from "./SpaceCards";

interface Props {
  searchParams: Promise<{ district?: string }>;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const { district } = await searchParams;
  if (!district) redirect("/");

  const lang = await getLang();

  const spaces = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, name: true,
      tagline: true, type: true, openingHours: true, imageUrl: true,
    },
  });

  const exploringLabel = lang === "ko" ? "지금 탐험할 지역" : lang === "ja" ? "探索中のエリア" : "Exploring";
  const homeLabel      = lang === "ko" ? "홈" : "home";
  const emptyMsg       = lang === "ko"
    ? <>&gt; 아직 {district}에 등록된 공간이 없어.<br />&nbsp;&nbsp;조금 기다려봐.</>
    : lang === "ja"
    ? <>&gt; {district}にはまだ登録された空間がありません。<br />&nbsp;&nbsp;少し待ってください。</>
    : <>&gt; No spaces registered in {district} yet.<br />&nbsp;&nbsp;Check back soon.</>;
  const otherAreaLabel = lang === "ko" ? "다른 지역 보기 _" : lang === "ja" ? "他のエリアを見る _" : "View other areas _";
  const foundLabel     = lang === "ko"
    ? `${spaces.length}곳을 발견했어`
    : lang === "ja"
    ? `${spaces.length}件の空間を発見`
    : `${spaces.length} space${spaces.length !== 1 ? "s" : ""} found`;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs">SPACECUBE / DISCOVER</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; {homeLabel}</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--dim)" }}>&gt; {exploringLabel}</p>
        <p className="text-xl tracking-widest">{district.toUpperCase()}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <p className="text-sm" style={{ color: "var(--dim)" }}>{emptyMsg}</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; {otherAreaLabel}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--dim)" }}>// {foundLabel}</p>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
