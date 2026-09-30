import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { SPACES, spaceHref } from "@/content/spaces";
import { CURATIONS } from "@/content/curations";
import { AdminPageHeader, AdminTable, NotReady, StatusBadge, adminButtonClass } from "@/components/admin/ui";

/**
 * CONTENT › 공간 콘텐츠 — 홈페이지 /spaces의 공개 공간(src/content/spaces.ts)을 읽기 전용으로 보여준다.
 * Cube 운영 DB의 "운영 공간"과는 별개 데이터다. 수정·저장 기능은 CMS 단계에서 만든다.
 */
export default async function AdminContentSpacesPage() {
  await requireAdminPage();

  return (
    <>
      <AdminPageHeader
        area="content"
        title="공간 콘텐츠"
        description="홈페이지에서 공개적으로 소개하고 탐색하는 공간입니다. Cube가 없는 공간도 등록할 수 있으며, 현장 운영 데이터인 '운영 공간'과는 별개예요."
      />
      <div className="mb-5"><NotReady description="현재는 src/content/spaces.ts 정적 데이터를 읽기 전용으로 보여줍니다. 추가·수정은 CMS 단계에서 제공됩니다." /></div>
      <AdminTable head={["공간", "지역", "카테고리", "Cube", "소개", "큐레이션", "상태", ""]} minWidth={880}>
        {SPACES.map((s) => {
          const inCurations = CURATIONS.filter((c) => c.spaceSlugs.includes(s.slug)).length;
          return (
            <tr key={s.slug}>
              <td>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>/spaces/{s.slug}</p>
              </td>
              <td>{s.area}</td>
              <td>{s.category}</td>
              <td>{s.cubeAvailable ? <StatusBadge tone="neutral">설치</StatusBadge> : <span style={{ color: "var(--a-faint)" }}>—</span>}</td>
              <td className="text-xs" style={{ color: s.description?.length ? undefined : "var(--a-faint)" }}>
                {s.description?.length ? "작성됨" : "미작성"}
              </td>
              <td className="tabular-nums">{inCurations}</td>
              <td><StatusBadge tone="static">STATIC</StatusBadge></td>
              <td className="text-right">
                <Link href={spaceHref(s.slug)} target="_blank" className={adminButtonClass("ghost", "sm")}>보기 ↗</Link>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
