import { requireAdminPage } from "@/lib/adminGuard";
import { ENABLE_EDITORIAL_HOME } from "@/lib/features";
import { getSpace } from "@/content/spaces";
import { getCuration, formatCurationNumber } from "@/content/curations";
import { getPerson, formatPeopleNumber } from "@/content/people";
import { FEATURED_CURATION_SLUG, FEATURED_SPACE_SLUGS, HERO_IMAGE_SPACE_SLUG, LATEST_FEED, PARTICIPATION, INSTAGRAM_URL, CONTACT_EMAIL } from "@/content/site";
import { AdminPageHeader, AdminSection, AdminButtonLink, NotReady, StatusBadge } from "@/components/admin/ui";

/** CONTENT › 홈페이지 — 현재 공개 상태와 홈 구성(정적 설정)을 읽기 전용으로 보여준다. */
export default async function AdminContentHomePage() {
  await requireAdminPage();

  const hero = getSpace(HERO_IMAGE_SPACE_SLUG);
  const featured = getCuration(FEATURED_CURATION_SLUG);
  const feed = LATEST_FEED.map((f) => {
    if (f.kind === "people") { const p = getPerson(f.slug); return { kind: "PEOPLE", label: p ? `${formatPeopleNumber(p.number)} · ${p.title}` : f.slug }; }
    if (f.kind === "curation") { const c = getCuration(f.slug); return { kind: "CURATION", label: c ? `${formatCurationNumber(c.number)} · ${c.region}` : f.slug }; }
    return { kind: "SPACE", label: getSpace(f.slug)?.name ?? f.slug };
  });

  const rows: { section: string; value: React.ReactNode }[] = [
    { section: "HERO 이미지", value: hero ? `${hero.name} (공간 콘텐츠)` : "—" },
    { section: "FEATURED CURATION", value: featured ? `${formatCurationNumber(featured.number)} · ${featured.region} — ${featured.title}` : "—" },
    {
      section: "LATEST STORIES",
      value: (
        <ol className="space-y-1">
          {feed.map((f, i) => (
            <li key={i} className="flex gap-2"><span className="text-[11px] w-16 shrink-0" style={{ color: "var(--a-dim)" }}>{f.kind}</span>{f.label}</li>
          ))}
        </ol>
      ),
    },
    { section: "EXPLORE SPACE", value: `${FEATURED_SPACE_SLUGS.length}곳 — ${FEATURED_SPACE_SLUGS.map((s) => getSpace(s)?.name ?? s).join(", ")}` },
    { section: "참여 영역", value: PARTICIPATION.map((p) => p.cta).join(" · ") + ` (이메일 ${CONTACT_EMAIL})` },
    { section: "Instagram", value: INSTAGRAM_URL },
  ];

  return (
    <>
      <AdminPageHeader
        area="content"
        title="홈페이지"
        description="공간큐브 홈페이지의 콘텐츠와 노출 상태입니다. 온라인에서 공간·사람·지역을 발견하는 영역으로, 현장 Cube의 에피소드·방명록과는 분리되어 있습니다."
        actions={<AdminButtonLink href="/" external>홈페이지 보기 ↗</AdminButtonLink>}
      />

      <div className="space-y-10 max-w-3xl">
        <div className="a-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">새 홈페이지 공개 상태</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--a-dim)" }}>
              {ENABLE_EDITORIAL_HOME
                ? "모든 방문자에게 새 홈페이지(CURATION / PEOPLE / SPACE)가 공개되어 있습니다."
                : "현재 관리자 계정만 새 홈페이지를 미리 봅니다. 일반 방문자에게는 기존 홈이 보입니다(관리자가 기존 홈 보기: /?legacy=1)."}
            </p>
          </div>
          {ENABLE_EDITORIAL_HOME ? <StatusBadge tone="live">전체 공개</StatusBadge> : <StatusBadge tone="draft">관리자 미리보기</StatusBadge>}
        </div>

        <AdminSection title="현재 홈 구성" description="src/content/site.ts 정적 설정 기준입니다.">
          <dl className="a-card divide-y">
            {rows.map((r) => (
              <div key={r.section} className="grid gap-2 sm:grid-cols-[180px_1fr] px-4 py-3 text-sm" style={{ borderColor: "var(--a-line)" }}>
                <dt className="a-eyebrow pt-0.5">{r.section}</dt>
                <dd className="leading-relaxed break-all">{r.value}</dd>
              </div>
            ))}
          </dl>
        </AdminSection>

        <NotReady description="향후 이곳에서 Featured Content 선택과 홈페이지 섹션 순서·노출을 관리할 예정입니다. 지금은 src/content/의 정적 데이터를 수정해 배포합니다." />
      </div>
    </>
  );
}
