import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { listContentStream } from "@/lib/editorial/queries";
import { CONTENT_KIND_LABEL, type ContentItem } from "@/lib/editorial/types";
import { AdminPageHeader, AdminSection, AdminButtonLink, StatusBadge, EmptyState } from "@/components/admin/ui";
import { EditorialStatusBadge } from "@/components/admin/editorial/EditorialControls";

const LATEST_COUNT = 5;

function adminHref(item: ContentItem): string {
  const id = item.key.slice(item.key.indexOf("-") + 1);
  return item.kind === "curation" ? `/admin/content/curations/${id}` : item.kind === "person" ? `/admin/content/people/${id}` : `/admin/content/spaces/${id}`;
}

/**
 * CONTENT › 홈페이지 — HOME은 자동 규칙으로만 구성된다(발행 콘텐츠를 publishedAt DESC).
 * 관리자가 홈을 따로 편집하지 않는다. 여기서는 규칙과 "지금 HOME에 보이는 순서"를 확인만 한다.
 */
export default async function AdminContentHomePage() {
  await requireAdminPage();
  const [published, withDrafts] = await Promise.all([listContentStream(), listContentStream({ preview: true })]);
  const latest = published.slice(0, LATEST_COUNT);
  const draftCount = withDrafts.filter((i) => i.status === "DRAFT").length;
  const byKind = (k: ContentItem["kind"]) => published.filter((i) => i.kind === k).length;

  return (
    <>
      <AdminPageHeader
        area="content"
        title="홈페이지"
        description="HOME은 자동으로 구성됩니다. 공간 콘텐츠·큐레이션·PEOPLE을 발행하면 발행일 순으로 LATEST와 콘텐츠 피드에 바로 반영되고, 따로 홈을 편집할 필요가 없어요."
        actions={
          <>
            <AdminButtonLink href="/?preview=drafts" external>초안 포함 미리보기 ↗</AdminButtonLink>
            <AdminButtonLink href="/" external>홈페이지 보기 ↗</AdminButtonLink>
          </>
        }
      />

      <div className="space-y-10 max-w-3xl">
        <div className="a-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">새 홈페이지 공개 상태</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>
              {ENABLE_EDITORIAL_HOME
                ? "모든 방문자에게 새 홈페이지가 공개되어 있습니다."
                : "현재 관리자 계정만 새 홈페이지를 미리 봅니다. 일반 방문자에게는 기존 홈이 보입니다(관리자가 기존 홈 보기: /?legacy=1). 전체 공개는 코드 설정(ENABLE_EDITORIAL_HOME)으로 전환합니다."}
            </p>
          </div>
          {ENABLE_EDITORIAL_HOME ? <StatusBadge tone="live">전체 공개</StatusBadge> : <StatusBadge tone="draft">관리자 미리보기</StatusBadge>}
        </div>

        <AdminSection title="자동 노출 규칙">
          <dl className="a-card divide-y text-sm">
            {[
              ["LATEST", `발행된 콘텐츠 중 발행일이 가장 최근인 ${LATEST_COUNT}개 · 6초마다 자동 전환`],
              ["콘텐츠 피드", "발행된 콘텐츠 전체 · 발행일 최신순 · ALL / CURATION / PEOPLE / SPACE 필터"],
              ["초안·보관", "홈에 나오지 않아요. 초안은 '초안 포함 미리보기'로만 확인할 수 있습니다(관리자 전용)."],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 sm:grid-cols-[140px_1fr] px-4 py-3" style={{ borderColor: "var(--a-line)" }}>
                <dt className="a-eyebrow pt-0.5">{k}</dt>
                <dd className="leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </AdminSection>

        <AdminSection
          title={`지금 HOME의 LATEST (${latest.length}/${LATEST_COUNT})`}
          description={`발행 콘텐츠 ${published.length}개 — CURATION ${byKind("curation")} · PEOPLE ${byKind("person")} · SPACE ${byKind("space")}${draftCount ? ` / 초안 ${draftCount}개는 미리보기에서만 보입니다` : ""}`}
        >
          {latest.length === 0 ? (
            <EmptyState title="아직 발행된 콘텐츠가 없습니다" description="공간 콘텐츠·큐레이션·PEOPLE 중 하나를 발행하면 HOME에 나타납니다." />
          ) : (
            <ol className="a-card divide-y">
              {latest.map((it, i) => (
                <li key={it.key} style={{ borderColor: "var(--a-line)" }}>
                  <Link href={adminHref(it)} className="flex items-center gap-4 px-4 py-3 hover:bg-[#fafafa]">
                    <span className="w-6 text-xs tabular-nums" style={{ color: "var(--a-dim)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="a-eyebrow w-20" style={{ fontSize: 10 }}>{CONTENT_KIND_LABEL[it.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{it.title}</span>
                      <span className="block text-[11px]" style={{ color: "var(--a-dim)" }}>{it.eyebrow}</span>
                    </span>
                    <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--a-dim)" }}>{it.date}</span>
                    <EditorialStatusBadge status={it.status} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>
      </div>
    </>
  );
}
