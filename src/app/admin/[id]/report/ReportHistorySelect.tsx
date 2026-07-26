"use client";

import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
}

export default function ReportHistorySelect({
  spaceId,
  currentReportId,
  options,
}: {
  spaceId: string;
  currentReportId: string | null;
  options: Option[];
}) {
  const router = useRouter();

  return (
    <select
      value={currentReportId ?? ""}
      onChange={(e) => router.push(`/admin/${spaceId}/report${e.target.value ? `?reportId=${e.target.value}` : ""}`)}
      className="text-xs px-2 py-1.5 border bg-transparent outline-none"
      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
    >
      <option value="">이번 달 (미리보기)</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}
