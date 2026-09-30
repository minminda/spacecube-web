import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveOperatorSpaceOrRedirect } from "@/lib/operatorSession";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "운영 관리 홈 — 공간큐브",
  description: "역할별 메뉴에서 필요한 화면으로 이동합니다.",
};

interface Props {
  params: Promise<{ slug: string }>;
}

const MENU_ITEMS = [
  { href: "space", title: "내 공간 관리", desc: "공개 중인 공간 페이지를 확인합니다." },
  { href: "guestbook", title: "방명록 관리", desc: "방명록 화면을 설정하고 방문자의 기록을 관리합니다." },
] as const;

export default async function OperatorHomePage({ params }: Props) {
  const { slug: slugParam } = await params;
  const { id: spaceId, slug } = await resolveOperatorSpaceOrRedirect(slugParam, "");

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { cube: { select: { code: true } } },
  });
  if (!space) notFound();

  return (
    <main className="flex flex-col gap-8">
      <div className="flex items-center gap-4 pb-6" style={{ borderBottom: "1px solid var(--a-line)" }}>
        <div
          className="w-16 h-16 flex-shrink-0 border rounded-lg overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--border)" }}
        >
          {space.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={space.imageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="space-y-1.5 min-w-0">
          <p className="a-eyebrow">운영 공간</p>
          <h1 className="text-[22px] font-bold tracking-tight truncate">{space.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--dim)" }}>
            {space.isActive ? <StatusBadge tone="live">공개 중</StatusBadge> : <StatusBadge tone="off">비공개</StatusBadge>}
            <span>큐브 {space.cube?.code ?? "미배정"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`/operator/${slug}/${item.href}`}
            className="a-card flex items-center justify-between gap-4 p-5 transition-colors hover:border-[#cfcfcf] hover:bg-[#fafafa]"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-[15px] font-semibold">{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{item.desc}</p>
            </div>
            <span className="text-sm flex-shrink-0" style={{ color: "var(--dim)" }}>→</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
