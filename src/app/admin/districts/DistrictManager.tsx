"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DistrictStatus } from "@prisma/client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import AdminModal from "@/components/admin/ui/AdminModal";
import { findRegionConflict } from "@/lib/regions";
import PlaceSearch from "@/app/admin/PlaceSearch";

export interface RegionRow {
  id: string;
  name: string;
  status: DistrictStatus;
  spaceCount: number;
  lat: number | null;
  lng: number | null;
}

export interface UnregisteredRow { label: string; count: number; values: string[] }

const STATUS_LABEL: Record<DistrictStatus, string> = {
  ACTIVE: "사용자 화면에 표시",
  COMING_SOON: "오픈 예정",
  HIDDEN: "숨김",
};

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return "로그인이 만료되었어요. 다시 로그인해주세요.";
  return data.error ?? fallback;
}

export default function DistrictManager({ initialRegions, unregistered }: { initialRegions: RegionRow[]; unregistered: UnregisteredRow[] }) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [regions, setRegions] = useState(initialRegions);
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renameTarget, setRenameTarget] = useState<RegionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegionRow | null>(null);
  const [locatingId, setLocatingId] = useState<string | null>(null);

  const trimmedNew = newName.trim().replace(/\s+/g, " ");
  const newConflict = trimmedNew ? findRegionConflict(trimmedNew, regions) : null;
  const visible = useMemo(() => {
    const needle = q.trim();
    return needle ? regions.filter((r) => r.name.includes(needle)) : regions;
  }, [regions, q]);

  async function create(name: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/districts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) return showToast(await readError(res, "지역을 추가하지 못했어요."));
      const created = await res.json();
      setRegions((prev) => [...prev, { id: created.id, name: created.name, status: created.status, spaceCount: unregistered.find((u) => u.label === created.name)?.count ?? 0, lat: null, lng: null }]);
      setNewName("");
      showToast(`'${created.name}' 지역을 추가했어요.`);
      router.refresh();
    } catch {
      showToast("네트워크 오류로 추가하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function rename(row: RegionRow) {
    const name = editName.trim().replace(/\s+/g, " ");
    setBusy(true);
    try {
      const res = await fetch(`/api/districts/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) return showToast(await readError(res, "이름을 바꾸지 못했어요."));
      const updated = await res.json();
      setRegions((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: updated.name } : r)));
      setEditingId(null);
      setRenameTarget(null);
      showToast(updated.renamedSpaces > 0 ? `이름을 바꾸고 공간 ${updated.renamedSpaces}개의 지역도 함께 바꿨어요.` : "이름을 바꿨어요.");
      router.refresh();
    } catch {
      showToast("네트워크 오류로 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function requestRename(row: RegionRow) {
    const name = editName.trim().replace(/\s+/g, " ");
    if (!name || name === row.name) return setEditingId(null);
    const conflict = findRegionConflict(name, regions, row.id);
    if (conflict) return showToast(`이미 '${conflict.name}' 지역이 있어요.`);
    // 쓰는 공간이 있으면 영향을 먼저 알려준다
    if (row.spaceCount > 0) setRenameTarget(row);
    else void rename(row);
  }

  async function setStatus(row: RegionRow, status: DistrictStatus) {
    const prev = row.status;
    setRegions((p) => p.map((r) => (r.id === row.id ? { ...r, status } : r)));
    const res = await fetch(`/api/districts/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      setRegions((p) => p.map((r) => (r.id === row.id ? { ...r, status: prev } : r)));
      showToast(await readError(res, "상태를 바꾸지 못했어요."));
    }
  }

  async function setLocation(row: RegionRow, lat: number | null, lng: number | null) {
    const res = await fetch(`/api/districts/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lng }) });
    if (!res.ok) return showToast(await readError(res, "지도 위치를 저장하지 못했어요."));
    setRegions((p) => p.map((r) => (r.id === row.id ? { ...r, lat, lng } : r)));
    setLocatingId(null);
    showToast(lat === null ? "지도 위치를 해제했어요." : `'${row.name}' 지도 위치를 저장했어요.`);
  }

  async function move(row: RegionRow, direction: "up" | "down") {
    const res = await fetch(`/api/districts/${row.id}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction }) });
    if (!res.ok) return showToast("순서를 바꾸지 못했어요.");
    setRegions((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function remove(row: RegionRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/districts/${row.id}${row.spaceCount > 0 ? "?confirm=1" : ""}`, { method: "DELETE" });
      if (!res.ok) return showToast(await readError(res, "삭제하지 못했어요."));
      setRegions((prev) => prev.filter((r) => r.id !== row.id));
      setDeleteTarget(null);
      showToast(`'${row.name}' 지역을 삭제했어요.`);
      router.refresh();
    } catch {
      showToast("네트워크 오류로 삭제하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="a-card p-4 sm:p-5 space-y-3">
        <h2 className="text-[15px] font-semibold">지역 추가</h2>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => { e.preventDefault(); if (trimmedNew && !newConflict && !busy) void create(trimmedNew); }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="지역명 (예: 연남)"
            aria-label="새 지역명"
            className="a-input"
            style={{ height: 44 }}
          />
          <button type="submit" disabled={!trimmedNew || !!newConflict || busy} className="a-btn a-btn-primary" style={{ height: 44, minWidth: 96 }}>추가</button>
        </form>
        {newConflict && (
          <p className="text-xs" style={{ color: "var(--a-danger)" }}>
            이미 &lsquo;{newConflict.name}&rsquo; 지역이 있어요. &lsquo;연남&rsquo;과 &lsquo;연남동&rsquo;처럼 같은 동네는 한 번만 등록해요.
          </p>
        )}
        <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>동 이름은 &lsquo;동&rsquo;을 뺀 짧은 이름을 권장해요(연남동 → 연남).</p>
      </section>

      {unregistered.filter((u) => !regions.some((r) => r.name === u.label)).length > 0 && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold">아직 지역으로 등록되지 않은 값</h2>
            <p className="text-xs" style={{ color: "var(--a-dim)" }}>공간에는 쓰이지만 아래 목록에 없는 지역이에요. 등록하면 한 이름으로 관리돼요.</p>
          </div>
          <ul className="a-card divide-y" style={{ borderColor: "var(--a-line)" }}>
            {unregistered.filter((u) => !regions.some((r) => r.name === u.label)).map((u) => (
              <li key={u.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>공간 {u.count}개{u.values.length > 1 || u.values[0] !== u.label ? ` · 입력값: ${u.values.join(", ")}` : ""}</p>
                </div>
                <button type="button" className="a-btn a-btn-sm shrink-0" disabled={busy} onClick={() => create(u.label)}>지역으로 등록</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[15px] font-semibold">등록된 지역 <span className="font-normal" style={{ color: "var(--a-dim)" }}>{regions.length}개</span></h2>
          {regions.length > 5 && (
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="지역 검색" aria-label="지역 검색" className="a-input" style={{ maxWidth: 200 }} />
          )}
        </div>

        {visible.length === 0 ? (
          <div className="a-card px-6 py-10 text-center text-sm" style={{ borderStyle: "dashed", color: "var(--a-dim)" }}>
            {regions.length === 0 ? "등록된 지역이 없어요. 위에서 첫 지역을 추가해보세요." : "검색 결과가 없어요."}
          </div>
        ) : (
          <ul className="a-card divide-y" style={{ borderColor: "var(--a-line)" }}>
            {visible.map((r) => {
              const idx = regions.findIndex((x) => x.id === r.id);
              const editing = editingId === r.id;
              return (
                <li key={r.id} className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); requestRename(r); }}>
                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="지역명" className="a-input" />
                        <button type="submit" className="a-btn a-btn-primary a-btn-sm" style={{ height: 38 }} disabled={busy}>저장</button>
                        <button type="button" className="a-btn a-btn-ghost a-btn-sm" style={{ height: 38 }} onClick={() => setEditingId(null)}>취소</button>
                      </form>
                    ) : (
                      <p className="text-[15px] font-semibold truncate">{r.name}</p>
                    )}
                    <p className="text-xs pt-0.5" style={{ color: "var(--a-dim)" }}>
                      등록 공간 {r.spaceCount}개{r.spaceCount === 0 && " · 쓰는 공간 없음"}
                      {" · "}
                      {r.lat !== null && r.lng !== null ? `지도 위치 연결됨 (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)})` : "지도 위치 없음"}
                    </p>
                    {locatingId === r.id && (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[11px]" style={{ color: "var(--a-dim)" }}>지역의 중심점 용도예요(행정구역 경계 아님). 결과 하나를 선택하면 저장돼요.</p>
                        <PlaceSearch mode="region" buttonLabel={`${r.name} 검색`} defaultQuery={r.name} onPick={(p) => void setLocation(r, p.lat, p.lng)} />
                        {r.lat !== null && <button type="button" className="text-xs underline" onClick={() => void setLocation(r, null, null)}>지도 위치 해제</button>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r, e.target.value as DistrictStatus)}
                      aria-label={`${r.name} 표시 상태`}
                      className="a-input"
                      style={{ width: "auto", height: 34, fontSize: 12 }}
                    >
                      {Object.values(DistrictStatus).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={idx === 0} onClick={() => move(r, "up")} aria-label="위로">▲</button>
                    <button type="button" className="a-btn a-btn-ghost a-btn-sm" disabled={idx === regions.length - 1} onClick={() => move(r, "down")} aria-label="아래로">▼</button>
                    <button type="button" className="a-btn a-btn-sm" onClick={() => setLocatingId(locatingId === r.id ? null : r.id)}>{r.lat !== null ? "위치 변경" : "지도 위치"}</button>
                    <button type="button" className="a-btn a-btn-sm" onClick={() => { setEditingId(r.id); setEditName(r.name); }}>수정</button>
                    <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={() => setDeleteTarget(r)}>삭제</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AdminModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title={`'${renameTarget?.name}' → '${editName.trim()}' 이름 변경`}
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setRenameTarget(null)}>취소</button>
            <button type="button" className="a-btn a-btn-primary" disabled={busy} onClick={() => renameTarget && rename(renameTarget)}>변경</button>
          </>
        }
      >
        현재 {renameTarget?.spaceCount}개의 공간이 이 지역을 사용하고 있어요. 이름을 바꾸면 해당 공간들의 지역도 같은 이름으로 함께 바뀌어요.
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`'${deleteTarget?.name}' 지역을 삭제할까요?`}
        footer={
          <>
            <button type="button" className="a-btn" onClick={() => setDeleteTarget(null)}>취소</button>
            <button type="button" className="a-btn a-btn-danger" disabled={busy} onClick={() => deleteTarget && remove(deleteTarget)}>삭제</button>
          </>
        }
      >
        {deleteTarget && deleteTarget.spaceCount > 0
          ? `현재 ${deleteTarget.spaceCount}개의 공간이 이 지역을 사용하고 있습니다. 지역 목록에서만 지워지고, 공간에 적힌 지역 값은 그대로 남아요.`
          : "쓰는 공간이 없는 지역이에요."}
      </AdminModal>

      <Toast message={toast} />
    </div>
  );
}
