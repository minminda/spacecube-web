import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ENABLE_MULTILINGUAL } from "@/lib/pilotFlags";
import { AreaTag, StatusBadge } from "@/components/admin/ui";
import SpaceTabs, { type SpaceTab } from "@/components/admin/ui/SpaceTabs";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * 운영 공간 상세 공통 헤더 + 탭(정보 · 에피소드 · 방명록 · 리포트 · QR · 태그). 각 탭은 기존
 * /admin/[id]/* 페이지를 그대로 쓴다 — 권한 판정·데이터 로직은 각 페이지에 그대로 있다.
 * 관리자가 아니거나 공간이 없으면 아무것도 덧붙이지 않고 페이지만 렌더한다(기존 redirect/404 유지).
 */
export default async function AdminSpaceLayout({ children, params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!isAdmin(session?.user?.email)) return <>{children}</>;

  const space = await prisma.space.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, isActive: true, isDemo: true, district: true, cube: { select: { code: true } } },
  });
  if (!space) return <>{children}</>;

  const base = `/admin/${space.id}`;
  const tabs: SpaceTab[] = [
    { href: `${base}/edit`, label: "정보", match: `${base}/edit` },
    { href: `${base}/episodes`, label: "에피소드", match: `${base}/episodes` },
    { href: `${base}/guestbook`, label: "방명록", match: `${base}/guestbook` },
    { href: `${base}/report`, label: "KPI / 리포트", match: `${base}/report` },
    { href: `${base}/qr`, label: "QR", match: `${base}/qr` },
    { href: `${base}/space-tags`, label: "태그", match: `${base}/space-tags` },
    ...(ENABLE_MULTILINGUAL ? [{ href: `${base}/translations`, label: "다국어", match: `${base}/translations` }] : []),
  ];

  return (
    <>
      <div className="no-print mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--a-dim)" }}>
          <AreaTag area="cube" />
          <Link href="/admin/spaces" className="hover:underline underline-offset-4">운영 공간</Link>
          <span style={{ color: "var(--a-faint)" }}>/</span>
          <span>{space.name}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <p className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight">{space.name}</p>
            {space.isActive ? <StatusBadge tone="live">공개</StatusBadge> : <StatusBadge tone="off">비공개</StatusBadge>}
            {space.isDemo && <Link href="/admin/demo-data"><StatusBadge tone="draft">시연 · 서비스 제외</StatusBadge></Link>}
            <span className="text-xs" style={{ color: "var(--a-dim)" }}>
              {space.district ?? "지역 미입력"} · 큐브 {space.cube?.code ?? "미배정"}
            </span>
          </div>
          <a href={`/space/${space.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline underline-offset-4" style={{ color: "var(--a-dim)" }}>
            현장 페이지 보기 ↗
          </a>
        </div>
        <SpaceTabs tabs={tabs} />
      </div>
      {children}
    </>
  );
}
