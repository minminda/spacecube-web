import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { findSpaceReferences } from "@/lib/editorial/references";
import { getTagSuggestions, getTypeSuggestions, storedBlocks } from "@/lib/editorial/admin";
import { AdminButtonLink, AdminPageHeader, AdminSection } from "@/components/admin/ui";
import EditorialSpaceForm from "@/components/admin/editorial/EditorialSpaceForm";
import { EditorialDangerZone } from "@/components/admin/editorial/EditorialControls";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEditorialSpacePage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const s = await prisma.editorialSpace.findUnique({ where: { id } });
  if (!s) notFound();
  const [references, tagSuggestions, typeSuggestions, opsSpace] = await Promise.all([
    findSpaceReferences(s.id),
    getTagSuggestions(),
    getTypeSuggestions(),
    // Partner(함께한 공간)면 같은 slug의 운영 공간(Cube · Episode · 방명록)으로 이어 준다 — 데이터를 복제하지 않고 링크만
    prisma.space.findUnique({ where: { slug: s.slug }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "공간 콘텐츠", href: "/admin/content/spaces" }]}
        title={s.name}
        description={`/spaces/${s.slug}`}
        actions={<AdminButtonLink href={`/spaces/${s.slug}`} external>사용자 화면에서 보기 ↗</AdminButtonLink>}
      />
      <div className="space-y-10">
        <EditorialSpaceForm
          id={s.id}
          status={s.status}
          tagSuggestions={tagSuggestions}
          typeSuggestions={typeSuggestions}
          initial={{
            slug: s.slug, name: s.name, area: s.area, category: s.category,
            summary: s.summary ?? "", description: s.description ?? "",
            coverImage: s.coverImage, coverPosition: s.coverPosition, images: s.images,
            tags: s.tags.join(", "), address: s.address ?? "", openingHours: s.openingHours ?? "",
            mapUrl: s.mapUrl ?? "", instagram: s.instagram ?? "", website: s.website ?? "",
            cubeAvailable: s.cubeAvailable, story: storedBlocks(s.story),
          }}
        />
        <div className="max-w-3xl space-y-8">
          {s.cubeAvailable && (
            <AdminSection title="Partner · Cube 운영" description="현장 Cube · Episode · 방명록은 운영 공간에서 관리합니다.">
              {opsSpace ? (
                <div className="flex flex-wrap gap-2">
                  <AdminButtonLink href={`/admin/${opsSpace.id}`} size="sm">운영 공간: {opsSpace.name}</AdminButtonLink>
                  <AdminButtonLink href={`/admin/${opsSpace.id}/episodes`} size="sm">에피소드</AdminButtonLink>
                  <AdminButtonLink href="/admin/cubes" size="sm">큐브</AdminButtonLink>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--a-dim)" }}>같은 주소(slug) <code>{s.slug}</code>의 운영 공간이 아직 없어요. <AdminButtonLink href="/admin/new" size="sm">운영 공간 만들기</AdminButtonLink></p>
              )}
            </AdminSection>
          )}
          <AdminSection title="이 공간이 쓰인 곳" description="큐레이션·피플·생각 연결, 본문 공간 카드, 사용자 저장을 모두 확인합니다.">
            {references.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--a-dim)" }}>아직 어디에서도 쓰이지 않아요.</p>
            ) : (
              <ul className="a-card divide-y">
                {references.map((r, i) => (
                  <li key={i} className="px-4 py-2.5 text-sm" style={{ borderColor: "var(--a-line)" }}>
                    <Link href={r.href} className="hover:underline underline-offset-4">{r.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>
          <EditorialDangerZone kind="spaces" id={s.id} status={s.status} name={s.name} />
        </div>
      </div>
    </>
  );
}
