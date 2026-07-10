import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { recomputeSpaceKPI, getLatestSpaceKPI, type TopTagEntry } from "@/lib/kpi";

interface Props { params: Promise<{ id: string }> }

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export default async function SpaceKPIPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id }, select: { id: true, name: true, slug: true } });
  if (!space) notFound();

  // 화면에서 매번 원본 테이블을 다시 계산하지 않지만, 관리자가 최신 값을 보도록
  // 조회 시점에 한 번만 오늘 날짜(KST) 행을 갱신한다. 실제 갱신은 기록/방명록 이벤트에서도 일어난다.
  await recomputeSpaceKPI(id);
  const kpi = await getLatestSpaceKPI(id);

  const topTags = (kpi?.topTags as unknown as TopTagEntry[] | null) ?? [];

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / KPI</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>공간 KPI</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
        {kpi && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>
            기준일 {kpi.date.toISOString().slice(0, 10)} (KST)
          </p>
        )}
      </div>

      {!kpi ? (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            아직 이 공간에 대한 기록이 없습니다. 첫 방문 기록이 생기면 KPI가 쌓이기 시작합니다.
          </p>
        </>
      ) : (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// QR 이용자</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="오늘" value={kpi.qrUsersToday} unit="명" />
              <StatBox label="이번 달" value={kpi.qrUsersMonth} unit="명" />
              <StatBox label="누적" value={kpi.qrUsersTotal} unit="명" />
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 재방문</p>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="재방문" value={kpi.revisitUsersTotal} unit="명" />
              <StatBox label="재방문율" value={pct(kpi.revisitRate)} unit="" />
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 방명록 참여</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="작성" value={kpi.guestbookUsersTotal} unit="명" />
              <StatBox label="작성률" value={pct(kpi.guestbookRate)} unit="" />
              <StatBox label="포스트잇" value={kpi.totalGuestbookCount} unit="개" />
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 평균 취향 적합도</p>
            <p className="text-2xl font-bold leading-none">
              {kpi.averageTasteScore != null ? kpi.averageTasteScore.toFixed(1) : "—"} <span className="text-sm font-normal" style={{ color: "var(--dim)" }}>/ 5</span>
            </p>
            {kpi.tasteScoreCount > 0 && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>{kpi.tasteScoreCount}건의 평가 기준</p>
            )}
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 방문자 취향 TOP3</p>
            {topTags.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--dim)" }}>
                아직 집계된 취향 태그가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {topTags.map((t, i) => (
                  <div key={t.tag} className="flex items-center gap-4">
                    <span className="text-xs w-4 flex-shrink-0" style={{ color: "var(--dim)" }}>{i + 1}</span>
                    <span className="text-sm font-medium flex-1">{t.label}</span>
                    <span className="text-xs" style={{ color: "var(--dim)" }}>{t.count}회</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 공간 사용 방식</p>
            {kpi.usageSummary ? (
              <p className="text-sm leading-relaxed pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--fg)" }}>
                {kpi.usageSummary}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--dim)" }}>아직 요약할 만한 기록이 충분하지 않습니다.</p>
            )}
          </section>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />
      <div className="flex gap-3 text-xs">
        <Link href={`/space/${space.slug}`} className="border px-3 py-1.5 transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
          공간 페이지 보기 →
        </Link>
      </div>
    </main>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {unit && <p className="text-xs" style={{ color: "var(--dim)" }}>{unit}</p>}
    </div>
  );
}
