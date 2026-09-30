import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminGuard";
import { findSpaceReferences } from "@/lib/editorial/references";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
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
  const references = await findSpaceReferences(s.id);

  return (
    <>
      <AdminPageHeader
        area="content"
        breadcrumb={[{ label: "공간 콘텐츠", href: "/admin/content/spaces" }]}
        title={s.name}
        description={`/spaces/${s.slug}`}
      />
      <div className="space-y-10">
        <EditorialSpaceForm
          id={s.id}
          status={s.status}
          initial={{
            slug: s.slug, name: s.name, area: s.area, category: s.category,
            summary: s.summary ?? "", description: s.description ?? "",
            coverImage: s.coverImage, coverPosition: s.coverPosition, images: s.images,
            tags: s.tags.join(", "), address: s.address ?? "", openingHours: s.openingHours ?? "",
            mapUrl: s.mapUrl ?? "", instagram: s.instagram ?? "", website: s.website ?? "",
            cubeAvailable: s.cubeAvailable,
          }}
        />
        <div className="max-w-3xl space-y-8">
          <AdminSection title="이 공간이 쓰인 곳" description="큐레이션·피플 연결, 본문 공간 카드, 홈페이지 설정을 모두 확인합니다.">
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
