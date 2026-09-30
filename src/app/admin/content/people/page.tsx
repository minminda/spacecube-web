import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { getPeople, formatPeopleNumber } from "@/content/people";
import { AdminPageHeader, AdminTable, NotReady, StatusBadge, adminButtonClass } from "@/components/admin/ui";

/** CONTENT › 피플 — src/content/people.ts 읽기 전용 목록. */
export default async function AdminContentPeoplePage() {
  await requireAdminPage();
  const people = getPeople();

  return (
    <>
      <AdminPageHeader
        area="content"
        title="피플"
        description="공간을 통해 한 사람을 알아가는 홈페이지 콘텐츠입니다. 현장 Cube의 에피소드와는 별개예요."
      />
      <div className="mb-5"><NotReady description="현재는 src/content/people.ts 정적 데이터를 읽기 전용으로 보여줍니다. 새 PEOPLE 작성·블록 편집·발행은 CMS 단계에서 제공됩니다." /></div>
      <AdminTable head={["번호", "제목", "소개 대상", "발행일", "상태", ""]} minWidth={720}>
        {people.map((p) => (
          <tr key={p.slug}>
            <td className="text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--a-dim)" }}>{formatPeopleNumber(p.number)}</td>
            <td className="font-semibold max-w-[360px]">{p.title}</td>
            <td style={{ color: p.subject ? undefined : "var(--a-faint)" }}>{p.subject ?? "미정"}</td>
            <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{p.publishedAt.replaceAll("-", ".")}</td>
            <td><StatusBadge tone="static">STATIC</StatusBadge></td>
            <td className="text-right">
              <Link href={`/people/${p.slug}`} target="_blank" className={adminButtonClass("ghost", "sm")}>보기 ↗</Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
