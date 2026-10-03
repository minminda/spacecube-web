import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { AdminPageHeader, AdminSection, StatusBadge } from "@/components/admin/ui";
import { EditorialStatusBadge } from "@/components/admin/editorial/EditorialControls";
import { ENABLE_CURATOR_PROTOTYPE } from "@/lib/features";
import CuratorAdminControls, { NewCuratorForm } from "./CuratorAdminControls";

/**
 * CONTENT › 큐레이터(프로토타입) — 큐레이터 = 큐레이터 프로필을 가진 사용자.
 * 이번 단계는 확인·공개 상태 관리·기존 사용자에게 프로필 붙이기까지. 컬렉션 편집은 아직
 * seed 스크립트(prisma/seed-curator-prototype.ts)로만 한다 — 사용자 화면 검증이 먼저다.
 */
export default async function AdminCuratorsPage() {
  await requireAdminPage();
  const [curators, demoSpaceCount] = await Promise.all([
    prisma.curatorProfile.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { email: true, nickname: true, isDemo: true } },
        collections: { orderBy: { displayOrder: "asc" }, include: { _count: { select: { spaces: true } } } },
      },
    }),
    prisma.editorialSpace.count({ where: { isDemo: true } }),
  ]);

  return (
    <>
      <AdminPageHeader
        area="content"
        title="큐레이터 (프로토타입)"
        description="큐레이터는 별도 계정이 아니라 공개 프로필을 가진 사용자입니다. 저장·방문·추천은 일반 사용자와 똑같이 쓰고, 컬렉션으로 자기 공간 취향을 공유합니다."
      />
      <div className="a-card px-4 py-3 mb-8 text-xs leading-relaxed space-y-1" style={{ color: "var(--a-dim)" }}>
        <p>
          공개 상태: {ENABLE_CURATOR_PROTOTYPE ? <StatusBadge tone="live">새 정보구조 방문자에게 공개</StatusBadge> : <StatusBadge tone="draft">관리자·로컬 미리보기 전용</StatusBadge>}
          <span className="ml-2">(ENABLE_CURATOR_PROTOTYPE)</span>
        </p>
        <p>가상 큐레이터·컬렉션·공간(가상 공간 {demoSpaceCount}곳)은 스위치와 무관하게 관리자·로컬에서만 보이며, 공개 목록·큐레이션·추천·홈에는 섞이지 않습니다. 정리: <code>npm run db:cleanup-curator-prototype</code></p>
        <p>
          사용자 화면: <Link href="/curators" className="underline underline-offset-4">/curators</Link> · <Link href="/find" className="underline underline-offset-4">/find</Link> · 추천·아카이브의 Prototype 블록
        </p>
      </div>

      <AdminSection title={`큐레이터 ${curators.length}`}>
        <ul className="space-y-6">
          {curators.map((c) => (
            <li key={c.id} className="a-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    <Link href={`/curators/${c.slug}`} className="hover:underline underline-offset-4">{c.name}</Link>
                    {c.isOfficial && <span className="ml-2 text-xs" style={{ color: "var(--a-dim)" }}>공식</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--a-dim)" }}>
                    사용자 {c.user.email ?? c.user.nickname ?? "(이메일 없음)"}{c.user.isDemo ? " · 가상 사용자" : ""} · /curators/{c.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.isDemo && <StatusBadge tone="draft">가상</StatusBadge>}
                  <EditorialStatusBadge status={c.status} />
                  <CuratorAdminControls kind="curators" id={c.id} status={c.status} />
                </div>
              </div>
              <p className="text-sm">{c.bio}</p>
              <ul className="divide-y" style={{ borderColor: "var(--a-line)" }}>
                {c.collections.map((col) => (
                  <li key={col.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" style={{ borderColor: "var(--a-line)" }}>
                    <span className="min-w-0">
                      <Link href={`/collections/${col.slug}`} className="hover:underline underline-offset-4">{col.title}</Link>
                      <span className="ml-2 text-xs" style={{ color: "var(--a-dim)" }}>{[col.area, `공간 ${col._count.spaces}`, col.keywords.join(", ")].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <EditorialStatusBadge status={col.status} />
                      <CuratorAdminControls kind="curator-collections" id={col.id} status={col.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection title="기존 사용자에게 큐레이터 프로필 추가" className="mt-10" description="초안으로 만들어집니다. 실제 큐레이터 검증 때 쓰세요.">
        <NewCuratorForm />
      </AdminSection>
    </>
  );
}
