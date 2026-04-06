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
  const ko = lang === "ko";

  const spaces = await prisma.space.findMany({
    where: { district, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      type: true,
      openingHours: true,
      imageUrl: true,
    },
  });

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between items-center">
          <p className="text-xs">SPACECUBE / DISCOVER</p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>&lt; {ko ? "홈" : "home"}</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          &gt; {ko ? "지금 탐험할 지역" : "Exploring"}
        </p>
        <p className="text-xl tracking-widest">{district.toUpperCase()}</p>
      </div>

      <p className="text-xs" style={{ color: "var(--border)" }}>─────────────────────────────</p>

      {spaces.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            {ko ? (
              <>&gt; 아직 {district}에 등록된 공간이 없어.<br />&nbsp;&nbsp;조금 기다려봐.</>
            ) : (
              <>&gt; No spaces registered in {district} yet.<br />&nbsp;&nbsp;Check back soon.</>
            )}
          </p>
          <Link href="/" className="text-xs" style={{ color: "var(--dim)" }}>
            &gt; {ko ? "다른 지역 보기 _" : "View other areas _"}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            // {ko ? `${spaces.length}곳을 발견했어` : `${spaces.length} space${spaces.length !== 1 ? "s" : ""} found`}
          </p>
          <SpaceCards spaces={spaces} />
        </>
      )}
    </main>
  );
}
