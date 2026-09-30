import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getAdminUserIds } from "@/lib/kpiEligibility";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { curationLabel, formatPeopleNumber } from "@/lib/editorial/types";
import { EditorialStatusBadge } from "@/components/admin/editorial/EditorialControls";
import { AdminPageHeader, AdminSection, AdminStat, AreaTag, StatusBadge, EmptyState } from "@/components/admin/ui";

const DAY = 24 * 60 * 60 * 1000;

/** n일 전 시각 — 요청 시점 기준(서버 컴포넌트, 렌더마다 새로 계산). */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function formatKst(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/**
 * 관리자 Overview — 온라인(CONTENT)과 현장(CUBE OPERATION)의 현재 상태를 한 화면에서 본다.
 * 숫자는 전부 실제 데이터다: CONTENT는 Editorial CMS 테이블, CUBE OPERATION은 기존
 * 테이블의 읽기 전용 집계(쓰기 없음). 없는 지표는 만들지 않는다.
 */
export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const since = daysAgo(7);
  const adminIds = [...(await getAdminUserIds())];
  // 로그인한 관리자 계정의 테스트 행동은 제외(비로그인 상태의 관리자 스캔은 구분 불가 — 기존 KPI와 동일한 한계).
  const notAdmin = adminIds.length > 0 ? { OR: [{ userId: null }, { userId: { notIn: adminIds } }] } : {};

  const [spaceTotal, spaceActive, cubeGroups, episodeTotal, episodePublished, scans7d, notes7d, recentScans, recentNotes] = await Promise.all([
    prisma.space.count(),
    prisma.space.count({ where: { isActive: true } }),
    prisma.cube.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.episode.count(),
    prisma.episode.count({ where: { published: true } }),
    prisma.spaceScan.count({ where: { scannedAt: { gte: since }, ...notAdmin } }),
    prisma.guestbookNote.count({ where: { createdAt: { gte: since }, deletedAt: null, ...notAdmin } }),
    prisma.spaceScan.findMany({
      where: notAdmin,
      orderBy: { scannedAt: "desc" },
      take: 6,
      select: { id: true, scannedAt: true, space: { select: { id: true, name: true } }, cube: { select: { code: true } } },
    }),
    prisma.guestbookNote.findMany({
      where: { deletedAt: null, ...notAdmin },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, content: true, createdAt: true, isHidden: true, space: { select: { id: true, name: true } } },
    }),
  ]);

  const cubeCount = (status: string) => cubeGroups.find((g) => g.status === status)?._count._all ?? 0;
  const cubeTotal = cubeGroups.reduce((sum, g) => sum + g._count._all, 0);

  // CONTENT — Editorial CMS(읽기 전용 집계)
  const [edSpaces, edCurations, edPeople] = await Promise.all([
    prisma.editorialSpace.findMany({ select: { status: true, cubeAvailable: true } }),
    prisma.editorialCuration.findMany({ select: { id: true, number: true, area: true, title: true, status: true, updatedAt: true } }),
    prisma.editorialPerson.findMany({ select: { id: true, number: true, title: true, status: true, updatedAt: true } }),
  ]);
  const published = (rows: { status: string }[]) => rows.filter((r) => r.status === "PUBLISHED").length;
  const drafts = (rows: { status: string }[]) => rows.filter((r) => r.status === "DRAFT").length;
  const recentContent = [
    ...edCurations.map((c) => ({ key: `c-${c.id}`, label: curationLabel(c), title: c.title, status: c.status, date: c.updatedAt, href: `/admin/content/curations/${c.id}` })),
    ...edPeople.map((p) => ({ key: `p-${p.id}`, label: formatPeopleNumber(p.number), title: p.title, status: p.status, date: p.updatedAt, href: `/admin/content/people/${p.id}` })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <>
      <AdminPageHeader title="Overview" description="오늘의 공간큐브 운영 상태를 확인하세요. 온라인에서 발견되는 공간큐브(Content)와 실제 공간에서 경험하는 공간큐브(Cube Operation)를 나눠 보여줍니다." />

      <div className="grid gap-10 xl:grid-cols-2">
        {/* CONTENT */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <AreaTag area="content" />
            <p className="text-xs" style={{ color: "var(--a-dim)" }}>홈페이지에서 발견되는 공개 콘텐츠</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <AdminStat label="공간 콘텐츠" value={edSpaces.length} hint={`발행 ${published(edSpaces)} · 초안 ${drafts(edSpaces)}`} href="/admin/content/spaces" />
            <AdminStat label="큐레이션" value={edCurations.length} hint={`발행 ${published(edCurations)} · 초안 ${drafts(edCurations)}`} href="/admin/content/curations" />
            <AdminStat label="피플" value={edPeople.length} hint={`발행 ${published(edPeople)} · 초안 ${drafts(edPeople)}`} href="/admin/content/people" />
          </div>
          <div className="a-card px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span>새 홈페이지 공개 상태</span>
            {ENABLE_EDITORIAL_HOME ? <StatusBadge tone="live">전체 공개</StatusBadge> : <StatusBadge tone="draft">관리자 미리보기</StatusBadge>}
          </div>
          <AdminSection title="최근 수정한 콘텐츠">
            {recentContent.length === 0 ? (
              <EmptyState title="아직 큐레이션·피플 콘텐츠가 없습니다" />
            ) : (
            <ul className="a-card divide-y" style={{ borderColor: "var(--a-line)" }}>
              {recentContent.map((c) => (
                <li key={c.key} style={{ borderColor: "var(--a-line)" }}>
                  <Link href={c.href} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>{c.label}</p>
                      <p className="text-sm truncate">{c.title}</p>
                    </div>
                    <EditorialStatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
            )}
          </AdminSection>
        </div>

        {/* CUBE OPERATION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <AreaTag area="cube" />
            <p className="text-xs" style={{ color: "var(--a-dim)" }}>실제 공간의 큐브 · 에피소드 · 방명록</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AdminStat label="운영 공간" value={spaceTotal} hint={`공개 ${spaceActive}`} href="/admin/spaces" />
            <AdminStat label="큐브" value={cubeTotal} hint={`배정 ${cubeCount("ASSIGNED")} · 미배정 ${cubeCount("UNASSIGNED")}`} href="/admin/cubes" />
            <AdminStat label="에피소드" value={episodeTotal} hint={`발행 ${episodePublished}`} href="/admin/content-status" />
            <AdminStat label="QR 스캔 · 7일" value={scans7d} hint="로그인한 관리자 제외" href="/admin/reports" />
            <AdminStat label="방명록 · 7일" value={notes7d} hint="삭제 제외 · 관리자 제외" href="/admin/guestbook" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <AdminSection title="최근 QR 이용">
              {recentScans.length === 0 ? (
                <EmptyState title="아직 QR 스캔 기록이 없습니다" />
              ) : (
                <ul className="a-card divide-y">
                  {recentScans.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm" style={{ borderColor: "var(--a-line)" }}>
                      <Link href={`/admin/${s.space.id}/report`} className="truncate hover:underline underline-offset-4">{s.space.name}</Link>
                      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>
                        {s.cube?.code ? `${s.cube.code} · ` : ""}{formatKst(s.scannedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
            <AdminSection title="최근 방명록">
              {recentNotes.length === 0 ? (
                <EmptyState title="아직 방명록이 없습니다" />
              ) : (
                <ul className="a-card divide-y">
                  {recentNotes.map((n) => (
                    <li key={n.id} className="px-4 py-2.5 space-y-0.5" style={{ borderColor: "var(--a-line)" }}>
                      <p className="text-sm truncate" style={{ color: n.isHidden ? "var(--a-faint)" : undefined }}>
                        {n.isHidden && <span className="text-[11px] mr-1.5">[숨김]</span>}
                        {n.content}
                      </p>
                      <p className="text-xs" style={{ color: "var(--a-dim)" }}>
                        <Link href={`/admin/${n.space.id}/guestbook`} className="hover:underline underline-offset-4">{n.space.name}</Link>
                        {" · "}{formatKst(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
          </div>
        </div>
      </div>
    </>
  );
}
