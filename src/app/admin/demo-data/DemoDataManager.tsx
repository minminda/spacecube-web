"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import { AdminSection, AdminTable, StatusBadge, adminButtonClass } from "@/components/admin/ui";

interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  district: string | null;
  isActive: boolean;
  isDemo: boolean;
  cubeCode: string | null;
  records: number;
  notes: number;
  saved: number;
}

interface DemoUserRow {
  id: string;
  email: string | null;
  nickname: string | null;
  records: number;
  notes: number;
  reactions: number;
}

async function patchJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "네트워크 오류로 변경하지 못했어요." } };
  }
}

/**
 * 서버 응답을 받은 뒤에만 화면을 바꾼다(낙관적 갱신 없음) — 시연/공개 상태는 실제 서비스
 * 노출을 좌우하는 스위치라, 화면과 DB가 어긋난 채로 보이는 순간이 없어야 한다.
 */
export default function DemoDataManager({ spaces, demoUsers }: { spaces: SpaceRow[]; demoUsers: DemoUserRow[] }) {
  const [spaceRows, setSpaceRows] = useState(spaces);
  const [userRows, setUserRows] = useState(demoUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const { toast, showToast } = useToast();

  async function toggleSpace(row: SpaceRow, field: "isDemo" | "isActive") {
    const next = !row[field];
    if (field === "isActive" && !next && !confirm(`'${row.name}'을(를) 비공개로 바꾸면 QR·직접 링크로도 열리지 않아요. 계속할까요?`)) return;
    setBusy(`${field}:${row.id}`);
    const { ok, data } = await patchJson(`/api/spaces/${row.id}/${field === "isDemo" ? "demo" : "active"}`, { [field]: next });
    setBusy(null);
    if (!ok) return showToast(typeof data.error === "string" ? data.error : "변경에 실패했어요.");
    setSpaceRows((prev) => prev.map((s) => (s.id === row.id ? { ...s, [field]: next } : s)));
    showToast(field === "isDemo" ? (next ? `'${row.name}'을(를) 시연 공간으로 지정했어요.` : `'${row.name}'이(가) 다시 서비스에 포함돼요.`) : (next ? "공개로 바꿨어요." : "비공개로 바꿨어요."));
  }

  async function releaseUsers(ids: string[]) {
    if (ids.length > 1 && !confirm(`시연 계정 ${ids.length}개를 모두 일반 계정으로 되돌릴까요? KPI와 실제 공간 방명록에 다시 포함돼요.`)) return;
    setBusy(ids.length > 1 ? "users:all" : `user:${ids[0]}`);
    const { ok, data } = await patchJson("/api/admin/demo-users", { userIds: ids, isDemo: false });
    setBusy(null);
    if (!ok) return showToast(typeof data.error === "string" ? data.error : "변경에 실패했어요.");
    const released = new Set(ids);
    setUserRows((prev) => prev.filter((u) => !released.has(u.id)));
    showToast(`${ids.length}개 계정을 일반 계정으로 되돌렸어요.`);
  }

  async function markUser(e: React.FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    setBusy("user:add");
    const { ok, data } = await patchJson("/api/admin/demo-users", { identifier: value, isDemo: true });
    setBusy(null);
    if (!ok) return showToast(typeof data.error === "string" ? data.error : "지정에 실패했어요.");
    setIdentifier("");
    showToast("시연 계정으로 지정했어요. 목록은 새로고침하면 반영돼요.");
  }

  const demoSpaceCount = spaceRows.filter((s) => s.isDemo).length;

  return (
    <div className="space-y-10">
      <AdminSection title="공간" description={`시연 공간 ${demoSpaceCount}곳 · 전체 ${spaceRows.length}곳`}>
        <AdminTable head={["운영 공간", "큐브", "기록 · 방명록 · 저장", "공개", "시연", ""]} minWidth={760}>
          {spaceRows.map((s) => (
            <tr key={s.id} style={{ opacity: s.isActive ? 1 : 0.6 }}>
              <td>
                <Link href={`/admin/${s.id}/edit`} className="font-semibold hover:underline underline-offset-4">{s.name}</Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--a-faint)" }}>/space/{s.slug}{s.district ? ` · ${s.district}` : ""}</p>
              </td>
              <td className="tabular-nums text-xs">{s.cubeCode ?? <span style={{ color: "var(--a-faint)" }}>—</span>}</td>
              <td className="tabular-nums text-xs" style={{ color: "var(--a-dim)" }}>{s.records} · {s.notes} · {s.saved}</td>
              <td>{s.isActive ? <StatusBadge tone="live">공개</StatusBadge> : <StatusBadge tone="off">비공개</StatusBadge>}</td>
              <td>{s.isDemo ? <StatusBadge tone="draft">시연</StatusBadge> : <span className="text-xs" style={{ color: "var(--a-faint)" }}>—</span>}</td>
              <td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" className={adminButtonClass("ghost", "sm")} disabled={busy !== null} onClick={() => toggleSpace(s, "isActive")}>
                    {s.isActive ? "비공개로" : "공개로"}
                  </button>
                  <button type="button" className={adminButtonClass(s.isDemo ? "primary" : "secondary", "sm")} disabled={busy !== null} onClick={() => toggleSpace(s, "isDemo")}>
                    {busy === `isDemo:${s.id}` ? "변경 중…" : s.isDemo ? "서비스에 포함" : "시연으로 지정"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>

      <AdminSection
        title="시연 계정"
        description={`${userRows.length}개 · 기록 ${userRows.reduce((n, u) => n + u.records, 0)} · 방명록 ${userRows.reduce((n, u) => n + u.notes, 0)} · 공감 ${userRows.reduce((n, u) => n + u.reactions, 0)}`}
        actions={userRows.length > 0 ? (
          <button type="button" className={adminButtonClass("secondary", "sm")} disabled={busy !== null} onClick={() => releaseUsers(userRows.map((u) => u.id))}>
            {busy === "users:all" ? "변경 중…" : "전체 일반 계정으로"}
          </button>
        ) : undefined}
      >
        <form onSubmit={markUser} className="flex flex-wrap items-center gap-2">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="이메일 또는 닉네임(정확히 일치)"
            className="a-input max-w-xs"
            aria-label="시연 계정으로 지정할 이메일 또는 닉네임"
          />
          <button type="submit" className={adminButtonClass("secondary")} disabled={busy !== null || !identifier.trim()}>
            {busy === "user:add" ? "지정 중…" : "시연 계정으로 지정"}
          </button>
        </form>
        {userRows.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--a-dim)" }}>시연 계정이 없습니다.</p>
        ) : (
          <AdminTable head={["계정", "닉네임", "기록 · 방명록 · 공감", ""]} minWidth={600}>
            {userRows.map((u) => (
              <tr key={u.id}>
                <td className="text-xs">{u.email ?? <span style={{ color: "var(--a-faint)" }}>이메일 없음</span>}</td>
                <td className="text-xs">{u.nickname ?? "—"}</td>
                <td className="tabular-nums text-xs" style={{ color: "var(--a-dim)" }}>{u.records} · {u.notes} · {u.reactions}</td>
                <td className="text-right">
                  <button type="button" className={adminButtonClass("ghost", "sm")} disabled={busy !== null} onClick={() => releaseUsers([u.id])}>
                    일반 계정으로
                  </button>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminSection>

      <Toast message={toast} />
    </div>
  );
}
