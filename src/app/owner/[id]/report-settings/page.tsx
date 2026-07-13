import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import ReportSettingsForm from "./ReportSettingsForm";
import GenerateReportButton from "./GenerateReportButton";

interface Props {
  params: Promise<{ id: string }>;
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ReportSettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const { id: spaceId } = await params;
  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) notFound();

  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <div className="flex justify-between">
          <p className="text-xs">공간큐브 / ADMIN / REPORT</p>
          <Link href="/owner" className="text-xs" style={{ color: "var(--dim)" }}>&lt; admin</Link>
        </div>
        <p className="text-xs">─────────────────────────────</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>리포트 설정</p>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      <ReportSettingsForm
        spaceId={space.id}
        initial={{
          reportStartDate: toDateInputValue(space.reportStartDate),
          reportEnabled: space.reportEnabled,
          operatorNotifyEmail: space.operatorNotifyEmail ?? "",
          operatorNotifyPhone: space.operatorNotifyPhone ?? "",
        }}
      />

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 수동 리포트 생성</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
          공개일이 지났지만 아직 생성되지 않은 구간이 있으면 지금 생성합니다. 이미 생성된 구간은 다시 만들지 않습니다.
        </p>
        {space.reportStartDate ? (
          <GenerateReportButton spaceId={space.id} />
        ) : (
          <p className="text-xs" style={{ color: "var(--border)" }}>리포트 시작일을 먼저 저장해주세요.</p>
        )}
      </section>
    </main>
  );
}
