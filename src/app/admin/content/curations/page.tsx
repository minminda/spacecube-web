import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { getCurations, formatCurationNumber } from "@/content/curations";
import { getSpacesBySlugs } from "@/content/spaces";
import { FEATURED_CURATION_SLUG } from "@/content/site";
import { AdminPageHeader, AdminTable, NotReady, StatusBadge, adminButtonClass } from "@/components/admin/ui";

/** CONTENT › 큐레이션 — src/content/curations.ts 읽기 전용 목록. */
export default async function AdminContentCurationsPage() {
  await requireAdminPage();
  const curations = getCurations();

  return (
    <>
      <AdminPageHeader
        area="content"
        title="큐레이션"
        description="지역 하나를 하나의 관점으로 묶는 홈페이지 콘텐츠입니다. 선정 공간은 '공간 콘텐츠'를 참조합니다."
      />
      <div className="mb-5"><NotReady description="현재는 src/content/curations.ts 정적 데이터를 읽기 전용으로 보여줍니다. 새 큐레이션 작성·블록 편집·발행은 CMS 단계에서 제공됩니다." /></div>
      <AdminTable head={["번호", "지역 · 제목", "공간", "발행일", "상태", ""]} minWidth={760}>
        {curations.map((c) => (
          <tr key={c.slug}>
            <td className="text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--a-dim)" }}>{formatCurationNumber(c.number)}</td>
            <td>
              <p className="font-semibold">{c.region}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--a-dim)" }}>{c.title}</p>
            </td>
            <td className="text-xs" style={{ color: "var(--a-dim)" }}>{getSpacesBySlugs(c.spaceSlugs).map((s) => s.name).join(", ")}</td>
            <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{c.publishedAt.replaceAll("-", ".")}</td>
            <td className="space-x-1 whitespace-nowrap">
              <StatusBadge tone="static">STATIC</StatusBadge>
              {c.slug === FEATURED_CURATION_SLUG && <StatusBadge tone="neutral">홈 대표</StatusBadge>}
            </td>
            <td className="text-right">
              <Link href={`/curation/${c.slug}`} target="_blank" className={adminButtonClass("ghost", "sm")}>보기 ↗</Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
