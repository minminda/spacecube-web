import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { AdminButtonLink, AdminPageHeader, AdminTable, EmptyState, FilterBar, formatAdminDate } from "@/components/admin/ui";
import QuickIdeaForm from "@/components/admin/editorial/QuickIdeaForm";
import { PriorityText, StageBadge } from "@/components/admin/editorial/PipelineControls";
import { assigneeSuggestions, listBacklog } from "@/lib/editorial/pipelineDb";
import {
  EDITORIAL_STAGES, PIPELINE_KIND_LABEL, STAGE_LABEL, filterBacklog, isOverdue, parseBacklogFilter,
  type BacklogFilter, type BacklogType, type EditorialStageValue,
} from "@/lib/editorial/pipeline";

interface Props {
  searchParams: Promise<{ stage?: string; type?: string; q?: string }>;
}

const TYPES: BacklogType[] = ["ALL", "PEOPLE", "THOUGHT", "CURATION"];
const PUBLIC_BASE = { people: "/people", thoughts: "/thought", curations: "/curation" } as const;

function hrefWith(f: BacklogFilter, patch: Partial<BacklogFilter>): string {
  const n = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.stage !== "ALL") p.set("stage", n.stage);
  if (n.type !== "ALL") p.set("type", n.type);
  if (n.q) p.set("q", n.q);
  return p.size ? `/admin/content?${p}` : "/admin/content";
}

function Pill({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px]"
      style={{ background: on ? "var(--a-fg)" : "transparent", color: on ? "#fff" : "var(--a-dim)", border: on ? "1px solid var(--a-fg)" : "1px solid var(--a-line)" }}
    >
      {children}
    </Link>
  );
}

/**
 * CONTENT › 콘텐츠 백로그 — STORY(PEOPLE · THOUGHT)와 CURATION의 제작 항목을 한 표로.
 * 각 콘텐츠는 원래 테이블(EditorialPerson/Thought/Curation)에 그대로 있고, 행을 누르면 기존 편집 화면으로 간다.
 * 보관된 항목은 각 목록 화면(보관 탭)에서 본다.
 */
export default async function AdminContentBacklogPage({ searchParams }: Props) {
  await requireAdminPage();
  const f = parseBacklogFilter(await searchParams);
  const [all, assignees] = await Promise.all([listBacklog(), assigneeSuggestions()]);
  const rows = filterBacklog(all, f);
  const stageCount = (s: EditorialStageValue | "ALL") => filterBacklog(all, { ...f, stage: s }).length;
  const now = new Date();

  return (
    <>
      <AdminPageHeader
        area="content"
        title="콘텐츠 백로그"
        description="발행하면 LATEST·홈에 자동 반영"
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButtonLink href="/admin/content/people/new" size="sm">+ PEOPLE</AdminButtonLink>
            <AdminButtonLink href="/admin/content/thoughts/new" size="sm">+ THOUGHT</AdminButtonLink>
            <AdminButtonLink href="/admin/content/curations/new" size="sm">+ CURATION</AdminButtonLink>
          </div>
        }
      />

      <div className="mb-6"><QuickIdeaForm assigneeOptions={assignees} /></div>

      <FilterBar q={f.q} placeholder="제목 검색">
        {f.stage !== "ALL" && <input type="hidden" name="stage" value={f.stage} />}
        {f.type !== "ALL" && <input type="hidden" name="type" value={f.type} />}
      </FilterBar>
      <nav className="flex flex-wrap gap-1 mb-2" aria-label="단계">
        <Pill href={hrefWith(f, { stage: "ALL" })} on={f.stage === "ALL"}>전체 <span className="tabular-nums text-[11px] opacity-70">{stageCount("ALL")}</span></Pill>
        {EDITORIAL_STAGES.map((s) => (
          <Pill key={s} href={hrefWith(f, { stage: s })} on={f.stage === s}>
            {STAGE_LABEL[s].ko} <span className="tabular-nums text-[11px] opacity-70">{stageCount(s)}</span>
          </Pill>
        ))}
      </nav>
      <nav className="flex flex-wrap gap-1 mb-4" aria-label="유형">
        {TYPES.map((t) => <Pill key={t} href={hrefWith(f, { type: t })} on={f.type === t}>{t}</Pill>)}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title={all.length ? "조건에 맞는 항목이 없습니다" : "아직 백로그가 비어 있어요"} />
      ) : (
        <>
        {/* 휴대폰: 가로 스크롤 표 대신 짧은 카드 목록 — 유형 / 제목 / 단계 · 담당자 · 예정일 */}
        <ul className="md:hidden a-card divide-y" style={{ borderColor: "var(--a-line)" }}>
          {rows.map((r) => {
            const overdue = isOverdue(r.stage, r.scheduledAt, now);
            return (
              <li key={`m-${r.kind}-${r.id}`} style={{ borderColor: "var(--a-line)" }}>
                <Link href={`/admin/content/${r.kind}/${r.id}`} className="block px-4 py-3 space-y-1">
                  <p className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--a-dim)" }}>
                    {PIPELINE_KIND_LABEL[r.kind]}{r.priority === "HIGH" && <span style={{ color: "var(--a-danger)" }}> · 높음</span>}
                  </p>
                  <p className="text-[15px] font-semibold leading-snug">{r.title}</p>
                  <p className="text-xs flex flex-wrap items-center gap-x-1.5" style={{ color: overdue ? "var(--a-danger)" : "var(--a-dim)" }}>
                    <StageBadge stage={r.stage} />
                    {r.assignee && <span>· {r.assignee}</span>}
                    {r.stage === "PUBLISHED" ? <span>· 발행 {formatAdminDate(r.publishedAt)}</span> : r.scheduledAt && <span>· {formatAdminDate(r.scheduledAt)}{overdue ? " 지남" : ""}</span>}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden md:block">
        <AdminTable head={["유형", "제목 / 아이디어", "상태", "우선순위", "담당자", "발행 예정일"]} minWidth={820}>
          {rows.map((r) => {
            const overdue = isOverdue(r.stage, r.scheduledAt, now);
            return (
              <tr key={`${r.kind}-${r.id}`}>
                <td className="text-xs font-semibold whitespace-nowrap">{PIPELINE_KIND_LABEL[r.kind]}</td>
                <td>
                  <Link href={`/admin/content/${r.kind}/${r.id}`} className="font-semibold hover:underline underline-offset-4">{r.title}</Link>
                  <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>
                    {PUBLIC_BASE[r.kind]}/{r.slug} · 공간 {r.spaceCount}
                    {!r.hasCover && " · 대표 이미지 없음"}
                    {r.referenceCount > 0 && ` · 참고 링크 ${r.referenceCount}`}
                    {" · "}수정 {formatAdminDate(r.updatedAt)}
                  </p>
                </td>
                <td className="whitespace-nowrap"><StageBadge stage={r.stage} /></td>
                <td><PriorityText priority={r.priority} /></td>
                <td className="text-xs">{r.assignee ?? <span style={{ color: "var(--a-faint)" }}>—</span>}</td>
                <td className="text-xs tabular-nums whitespace-nowrap" style={{ color: overdue ? "var(--a-danger)" : undefined }}>
                  {r.stage === "PUBLISHED" ? <span style={{ color: "var(--a-dim)" }}>발행 {formatAdminDate(r.publishedAt)}</span> : formatAdminDate(r.scheduledAt)}
                  {overdue && <span className="block text-[11px]">예정일 지남 · 발행 필요</span>}
                </td>
              </tr>
            );
          })}
        </AdminTable>
        </div>
        </>
      )}
    </>
  );
}
