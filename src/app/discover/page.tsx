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
    select: { id: true, slug: true, name: true, tagline: true, type: true, openingHours: true, imageUrl: true },
  });

  const homeLabel =
    lang === "ko" ? "홈" : lang === "zh" ? "首页" : "home";
  const exploringLabel =
    lang === "ko" ? "지금 탐험할 지역" : lang === "ja" ? "探索中のエリア" :
    lang === "zh" ? "正在探索的区域" : "Exploring";
  const emptyMsg =
    lang === "ko" ? `아직 ${district}에 등록된 공간이 없어. 조금 기다려봐.` :
    lang === "ja" ? `${district}にはまだ登録された空間がありません。少し待ってください。` :
    lang === "zh" ? `${district}暂时还没有已登记的空间。请稍后再来。` :
                   `No spaces registered in ${district} yet. Check back soon.`;
  const otherAreaLabel =
    lang === "ko" ? "다른 지역 보기" : lang === "ja" ? "他のエリアを見る" :
    lang === "zh" ? "查看其他区域" : "View other areas";
  const foundLabel =
    lang === "ko" ? `${spaces.length}곳 발견` :
    lang === "ja" ? `${spaces.length}件の空間` :
    lang === "zh" ? `发现 ${spaces.length} 个空间` :
    `${spaces.length} space${spaces.length !== 1 ? "s" : ""}`;

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-8">
      <nav className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간큐브</p>
        <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>← {homeLabel}</Link>
      </nav>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{exploringLabel}</p>
        <h1 className="text-3xl font-bold">{district}</h1>
      </div>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{emptyMsg}</p>
          <Link href="/" className="text-sm" style={{ color: "var(--dim)" }}>{otherAreaLabel} →</Link>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>{foundLabel}</p>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
