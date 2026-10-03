import Link from "next/link";
import { AdminPageHeader, AdminTable, AdminButtonLink, EmptyState, FilterBar, StatusBadge, adminButtonClass, formatAdminDate } from "@/components/admin/ui";
import type { EditorialStatusValue } from "@/lib/editorial/types";
import { EditorialStatusBadge } from "./EditorialControls";
import StatusTabs from "./StatusTabs";

export interface DocRow {
  id: string;
  slug: string;
  numberLabel: string;
  title: string;
  sub?: string | null;
  spaceCount: number;
  status: EditorialStatusValue;
  updatedAt: Date;
  homeFeatured?: boolean;
}

interface Props {
  kind: "curations" | "people" | "thoughts";
  title: string;
  description: string;
  newLabel: string;
  searchPlaceholder: string;
  publicBase: string;
  q: string;
  filter: EditorialStatusValue | "ALL";
  counts: Record<EditorialStatusValue | "ALL", number>;
  rows: DocRow[];
}

/** 큐레이션·피플 관리자 목록(공용 표시 컴포넌트, 서버). */
export default function DocListPage({ kind, title, description, newLabel, searchPlaceholder, publicBase, q, filter, counts, rows }: Props) {
  const base = `/admin/content/${kind}`;
  return (
    <>
      <AdminPageHeader area="content" title={title} description={description} actions={<AdminButtonLink href={`${base}/new`} variant="primary">{newLabel}</AdminButtonLink>} />
      <FilterBar q={q} placeholder={searchPlaceholder}>
        {filter !== "ALL" && <input type="hidden" name="status" value={filter} />}
      </FilterBar>
      <StatusTabs base={base} current={filter} counts={counts} q={q} />
      {rows.length === 0 ? (
        <EmptyState
          title={q || filter !== "ALL" ? "조건에 맞는 콘텐츠가 없습니다" : "아직 콘텐츠가 없습니다"}
          action={<AdminButtonLink href={`${base}/new`} variant="primary">{newLabel}</AdminButtonLink>}
        />
      ) : (
        <AdminTable head={["번호", "제목", "공간", "상태", "수정일", ""]} minWidth={780}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="text-xs whitespace-nowrap" style={{ color: "var(--a-dim)" }}>{r.numberLabel}</td>
              <td>
                <Link href={`${base}/${r.id}`} className="font-semibold hover:underline underline-offset-4">{r.title}</Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>
                  {r.sub ? `${r.sub} · ` : ""}{publicBase}/{r.slug}
                </p>
              </td>
              <td className="tabular-nums">{r.spaceCount}</td>
              <td className="space-x-1 whitespace-nowrap">
                <EditorialStatusBadge status={r.status} />
                {r.homeFeatured && <StatusBadge tone="neutral">홈 대표</StatusBadge>}
              </td>
              <td className="text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{formatAdminDate(r.updatedAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <a href={`${publicBase}/${r.slug}`} target="_blank" rel="noopener noreferrer" className={adminButtonClass("ghost", "sm")}>{r.status === "PUBLISHED" ? "보기 ↗" : "미리보기 ↗"}</a>
                  <Link href={`${base}/${r.id}`} className={adminButtonClass("secondary", "sm")}>편집</Link>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}

export function statusCounts(groups: { status: EditorialStatusValue; _count: { _all: number } }[]) {
  const c = (s: EditorialStatusValue) => groups.find((g) => g.status === s)?._count._all ?? 0;
  return { ALL: groups.reduce((n, g) => n + g._count._all, 0), PUBLISHED: c("PUBLISHED"), DRAFT: c("DRAFT"), ARCHIVED: c("ARCHIVED") };
}
