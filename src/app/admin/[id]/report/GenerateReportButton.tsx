"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GenerateReportButton({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setMessage(null);
    setLatestReportId(null);
    const res = await fetch(`/api/admin/spaces/${spaceId}/generate-report`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "생성에 실패했습니다.");
      return;
    }
    setMessage(`${data.generated}개 구간 확인/생성 완료`);
    // reports는 getCompletedPeriods 순서(오래된 구간→최근 구간) 그대로 오므로 마지막 항목이 가장 최근 구간이다.
    const reports = (data.reports ?? []) as { id: string }[];
    if (reports.length > 0) setLatestReportId(reports[reports.length - 1].id);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {busy ? "생성 중..." : "월간 리포트 생성"}
      </button>
      {message && <p className="text-xs" style={{ color: "var(--dim)" }}>{message}</p>}
      {latestReportId && (
        <Link
          href={`/admin/${spaceId}/report?reportId=${latestReportId}`}
          className="inline-block text-xs underline"
          style={{ color: "var(--fg)" }}
        >
          가장 최근 리포트 보기 →
        </Link>
      )}
    </div>
  );
}
