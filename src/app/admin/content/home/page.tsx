import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { readStoredFeed } from "@/lib/editorial/input";
import { curationLabel, formatPeopleNumber } from "@/lib/editorial/types";
import { AdminPageHeader, AdminButtonLink, StatusBadge } from "@/components/admin/ui";
import HomeSettingsForm from "@/components/admin/editorial/HomeSettingsForm";

/**
 * CONTENT › 홈페이지 — 홈 레이아웃은 코드에 두고, 어떤 콘텐츠를 노출할지만 관리한다
 * (EditorialHomeSettings, 단일 행). 공개 홈에는 발행된 콘텐츠만 나온다.
 */
export default async function AdminContentHomePage() {
  await requireAdminPage();

  const [settings, spaces, curations, people] = await Promise.all([
    prisma.editorialHomeSettings.findUnique({ where: { id: "home" } }),
    prisma.editorialSpace.findMany({ orderBy: [{ area: "asc" }, { name: "asc" }], select: { id: true, name: true, area: true, status: true } }),
    prisma.editorialCuration.findMany({ orderBy: { number: "desc" }, select: { id: true, number: true, area: true, title: true, status: true } }),
    prisma.editorialPerson.findMany({ orderBy: { number: "desc" }, select: { id: true, number: true, title: true, status: true } }),
  ]);

  return (
    <>
      <AdminPageHeader
        area="content"
        title="홈페이지"
        description="홈페이지에 무엇을 노출할지 고릅니다. 홈 레이아웃(섹션 구성)은 코드에 고정되어 있고, 현장 Cube의 에피소드·방명록과는 분리되어 있어요."
        actions={<AdminButtonLink href="/" external>홈페이지 보기 ↗</AdminButtonLink>}
      />

      <div className="a-card p-5 mb-8 max-w-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">새 홈페이지 공개 상태</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>
            {ENABLE_EDITORIAL_HOME
              ? "모든 방문자에게 새 홈페이지(CURATION / PEOPLE / SPACE)가 공개되어 있습니다."
              : "현재 관리자 계정만 새 홈페이지를 미리 봅니다. 일반 방문자에게는 기존 홈이 보입니다(관리자가 기존 홈 보기: /?legacy=1). 전체 공개는 코드 설정(ENABLE_EDITORIAL_HOME)으로 전환합니다."}
          </p>
        </div>
        {ENABLE_EDITORIAL_HOME ? <StatusBadge tone="live">전체 공개</StatusBadge> : <StatusBadge tone="draft">관리자 미리보기</StatusBadge>}
      </div>

      <HomeSettingsForm
        initial={{
          heroSpaceId: settings?.heroSpaceId ?? null,
          featuredCurationId: settings?.featuredCurationId ?? null,
          featuredSpaceIds: settings?.featuredSpaceIds ?? [],
          feed: readStoredFeed(settings?.feed),
        }}
        spaces={spaces.map((s) => ({ id: s.id, label: `${s.name} · ${s.area}`, status: s.status }))}
        curations={curations.map((c) => ({ id: c.id, label: `${curationLabel({ number: c.number, area: c.area })} — ${c.title}`, status: c.status }))}
        people={people.map((p) => ({ id: p.id, label: `${formatPeopleNumber(p.number)} — ${p.title}`, status: p.status }))}
      />
    </>
  );
}
