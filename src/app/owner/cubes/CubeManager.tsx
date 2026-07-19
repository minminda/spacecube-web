"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CubeQR from "@/components/CubeQR";
import { formatDotDate as formatDate } from "@/lib/time";
import { useToast } from "@/hooks/useToast";

type CubeStatus = "UNASSIGNED" | "ASSIGNED" | "DISABLED";

export interface CubeRow {
  id: string;
  code: string;
  status: CubeStatus;
  space: { id: string; name: string; slug: string; district: string | null; imageUrl: string | null } | null;
  createdAt: string;
  activatedAt: string | null;
  scanCount: number;
  lastScanAt: string | null;
}

export interface SpaceOption {
  id: string;
  name: string;
  slug: string;
  district: string | null;
  imageUrl: string | null;
  /** 이미 연결된 큐브 코드가 있으면 그 코드, 없으면 null */
  connectedCubeCode: string | null;
}

interface Props {
  cubes: CubeRow[];
  spaceOptions: SpaceOption[];
  baseUrl: string;
  initialFocusCode: string | null;
}

const STATUS_LABEL: Record<CubeStatus, string> = {
  UNASSIGNED: "미등록",
  ASSIGNED: "연결됨",
  DISABLED: "비활성화",
};


function StatusBadge({ status }: { status: CubeStatus }) {
  const color = status === "ASSIGNED" ? "var(--fg)" : status === "DISABLED" ? "#ef4444" : "var(--dim)";
  return (
    <span className="text-xs px-1.5 py-0.5 border flex-shrink-0" style={{ borderColor: status === "DISABLED" ? "#ef4444" : "var(--border)", color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

type ConfirmAction =
  | { type: "unassign"; cube: CubeRow }
  | { type: "disable"; cube: CubeRow }
  | { type: "delete"; cube: CubeRow }
  | { type: "assign"; cube: CubeRow; targetSpace: SpaceOption };

export default function CubeManager({ cubes, spaceOptions, baseUrl, initialFocusCode }: Props) {
  const router = useRouter();

  const [filter, setFilter] = useState<"all" | CubeStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [generateOpen, setGenerateOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const [connectCube, setConnectCube] = useState<CubeRow | null>(
    initialFocusCode ? cubes.find((c) => c.code === initialFocusCode && c.status === "UNASSIGNED") ?? null : null,
  );
  const [spaceSearch, setSpaceSearch] = useState("");

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, showToast } = useToast();

  const counts = useMemo(() => ({
    total: cubes.length,
    unassigned: cubes.filter((c) => c.status === "UNASSIGNED").length,
    assigned: cubes.filter((c) => c.status === "ASSIGNED").length,
    disabled: cubes.filter((c) => c.status === "DISABLED").length,
  }), [cubes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cubes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || (c.space?.name.toLowerCase().includes(q) ?? false);
    });
  }, [cubes, filter, search]);

  const filteredSpaceOptions = useMemo(() => {
    const q = spaceSearch.trim().toLowerCase();
    if (!q) return spaceOptions;
    return spaceOptions.filter((s) => s.name.toLowerCase().includes(q));
  }, [spaceOptions, spaceSearch]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((c) => c.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const res = await fetch("/api/cubes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenerateMessage(data.error ?? "생성에 실패했어요.");
        return;
      }
      const created = data.cubes as { code: string }[];
      const first = created[0]?.code;
      const last = created[created.length - 1]?.code;
      setGenerateMessage(`큐브 ${created.length}개가 생성되었습니다.\n${first}부터 ${last}까지 생성되었습니다.`);
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  function closeGenerateModal() {
    setGenerateOpen(false);
    setQuantity(1);
    setGenerateMessage(null);
  }

  function openConnect(cube: CubeRow) {
    setConnectCube(cube);
    setSpaceSearch("");
  }

  function pickSpace(space: SpaceOption) {
    if (!connectCube) return;
    if (space.connectedCubeCode && space.connectedCubeCode !== connectCube.code) return; // 이미 다른 큐브 연결됨 — 선택 불가
    setConnectCube(null);
    setConfirmAction({ type: "assign", cube: connectCube, targetSpace: space });
  }

  async function runConfirm() {
    if (!confirmAction || busy) return;
    setBusy(true);
    try {
      let res: Response;
      if (confirmAction.type === "assign") {
        res = await fetch(`/api/cubes/${confirmAction.cube.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spaceId: confirmAction.targetSpace.id }),
        });
      } else if (confirmAction.type === "unassign") {
        res = await fetch(`/api/cubes/${confirmAction.cube.id}/unassign`, { method: "POST" });
      } else if (confirmAction.type === "disable") {
        res = await fetch(`/api/cubes/${confirmAction.cube.id}/disable`, { method: "POST" });
      } else {
        res = await fetch(`/api/cubes/${confirmAction.cube.id}`, { method: "DELETE" });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? "처리에 실패했어요.");
        return;
      }
      if (confirmAction.type === "assign") {
        showToast(`${confirmAction.cube.code} 큐브가 '${confirmAction.targetSpace.name}' 공간에 연결되었습니다.`);
      } else if (confirmAction.type === "unassign") {
        showToast(`${confirmAction.cube.code}의 연결이 해제되었습니다.`);
      } else if (confirmAction.type === "disable") {
        showToast(`${confirmAction.cube.code}가 비활성화되었습니다.`);
      } else {
        showToast(`${confirmAction.cube.code}가 삭제되었습니다.`);
      }
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  async function handleEnable(cube: CubeRow) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cubes/${cube.id}/enable`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error ?? "처리에 실패했어요.");
        return;
      }
      showToast(`${cube.code}가 다시 활성화되었습니다.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryBox label="전체" value={counts.total} />
        <SummaryBox label="미등록" value={counts.unassigned} />
        <SummaryBox label="연결됨" value={counts.assigned} />
        <SummaryBox label="비활성화" value={counts.disabled} />
      </div>

      {/* 액션바 */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            style={{ borderColor: "var(--fg)" }}
          >
            [[ 큐브 생성 ]]
          </button>
          <Link
            href={selected.size > 0 ? `/owner/cubes/print?codes=${[...selected].map((id) => cubes.find((c) => c.id === id)?.code).filter(Boolean).join(",")}` : "/owner/cubes/print"}
            className="text-sm px-4 py-2 border transition-colors text-center"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {selected.size > 0 ? `[ 선택 ${selected.size}개 인쇄 ]` : "[ 인쇄 페이지 ]"}
          </Link>
          {selected.size > 0 && (
            <button type="button" onClick={clearSelection} className="text-xs px-3 py-2" style={{ color: "var(--dim)" }}>
              선택 해제
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap text-xs">
          {(["all", "UNASSIGNED", "ASSIGNED", "DISABLED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 border transition-colors"
              style={{
                borderColor: filter === f ? "var(--fg)" : "var(--border)",
                color: filter === f ? "var(--fg)" : "var(--dim)",
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === "all" ? "전체" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="큐브 코드 또는 공간 이름 검색"
            className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
          <button type="button" onClick={selectAllFiltered} className="text-xs px-3 py-2 border flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
            전체 선택
          </button>
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>&gt; 조건에 맞는 큐브가 없어.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((cube) => {
            const qrUrl = `${baseUrl}/c/${cube.code}`;
            return (
              <div key={cube.id} className="p-4 border space-y-3" style={{ borderColor: "var(--border)", opacity: cube.status === "DISABLED" ? 0.6 : 1 }}>
                <div className="flex gap-4">
                  <label className="flex items-start pt-1 flex-shrink-0">
                    <input type="checkbox" checked={selected.has(cube.id)} onChange={() => toggleSelect(cube.id)} />
                  </label>
                  <div className="flex-shrink-0">
                    <CubeQR url={qrUrl} code={cube.code} size={64} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 text-xs" style={{ color: "var(--dim)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>{cube.code}</span>
                      <StatusBadge status={cube.status} />
                    </div>
                    <p>공간 : {cube.space ? `${cube.space.name}${cube.space.district ? ` (${cube.space.district})` : ""}` : "—"}</p>
                    <p>생성일 : {formatDate(cube.createdAt)} · 연결일 : {formatDate(cube.activatedAt)}</p>
                    <p>누적 스캔 : {cube.scanCount}회 · 마지막 스캔 : {formatDate(cube.lastScanAt)}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap text-xs pl-[calc(1rem+64px+1rem)]">
                  {cube.status === "UNASSIGNED" && (
                    <button type="button" onClick={() => openConnect(cube)} className="border px-3 py-1.5 transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]" style={{ borderColor: "var(--fg)" }}>
                      공간 연결
                    </button>
                  )}
                  {cube.status === "ASSIGNED" && (
                    <>
                      <button type="button" onClick={() => openConnect(cube)} className="border px-3 py-1.5 transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                        다른 공간으로 변경
                      </button>
                      <button type="button" onClick={() => setConfirmAction({ type: "unassign", cube })} className="border px-3 py-1.5 transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                        연결 해제
                      </button>
                      {cube.space && (
                        <Link href={`/space/${cube.space.slug}`} className="border px-3 py-1.5 self-center" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                          공간 보기 →
                        </Link>
                      )}
                    </>
                  )}
                  {cube.status !== "DISABLED" ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "disable", cube })}
                      className="border px-3 py-1.5 transition-colors hover:border-red-500 hover:text-red-500"
                      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                    >
                      큐브 비활성화
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleEnable(cube)} disabled={busy} className="border px-3 py-1.5 transition-colors disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                      큐브 다시 활성화
                    </button>
                  )}
                  {cube.status !== "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", cube })}
                      className="border px-3 py-1.5 transition-colors hover:border-red-500 hover:text-red-500"
                      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                    >
                      큐브 삭제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 큐브 생성 모달 ── */}
      {generateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) closeGenerateModal(); }}>
          <div className="w-full max-w-sm p-6 space-y-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold">큐브 생성</p>
            {generateMessage ? (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-line">{generateMessage}</p>
                <button type="button" onClick={closeGenerateModal} className="w-full py-2.5 text-sm border" style={{ borderColor: "var(--fg)" }}>
                  닫기
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs" style={{ color: "var(--dim)" }}>생성 수량 (최대 100개)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={closeGenerateModal} className="flex-1 py-2.5 text-sm border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                    취소
                  </button>
                  <button type="button" onClick={handleGenerate} disabled={generating} className="flex-1 py-2.5 text-sm border disabled:opacity-40" style={{ borderColor: "var(--fg)" }}>
                    {generating ? "생성 중..." : "생성하기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 공간 선택 모달 ── */}
      {connectCube && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) setConnectCube(null); }}>
          <div className="w-full max-w-sm max-h-[80vh] flex flex-col p-6 gap-4 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="text-sm font-semibold">{connectCube.code}를 연결할 공간 선택</p>
            <input
              autoFocus
              value={spaceSearch}
              onChange={(e) => setSpaceSearch(e.target.value)}
              placeholder="공간 이름 검색"
              className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredSpaceOptions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--dim)" }}>검색 결과가 없어요.</p>
              ) : (
                filteredSpaceOptions.map((s) => {
                  const takenByOther = !!s.connectedCubeCode && s.connectedCubeCode !== connectCube.code;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSpace(s)}
                      disabled={takenByOther}
                      className="w-full flex items-center gap-3 p-2.5 border text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--tag-bg)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {s.imageUrl ? (
                        <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden">
                          <Image src={s.imageUrl} alt="" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex-shrink-0" style={{ background: "var(--tag-bg)" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.name}</p>
                        <p className="text-xs" style={{ color: "var(--dim)" }}>{s.district ?? "—"}</p>
                        {takenByOther && (
                          <p className="text-xs" style={{ color: "#ef4444" }}>이미 {s.connectedCubeCode} 연결됨</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <button type="button" onClick={() => setConnectCube(null)} className="w-full py-2.5 text-sm border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 확인 모달 ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null); }}>
          <div className="w-full max-w-sm p-6 space-y-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            {confirmAction.type === "assign" && (
              <>
                <p className="text-sm leading-relaxed">
                  {confirmAction.cube.space
                    ? <>{confirmAction.cube.code}의 연결 공간을<br />&lsquo;{confirmAction.cube.space.name}&rsquo;에서 &lsquo;{confirmAction.targetSpace.name}&rsquo;로 변경하시겠습니까?</>
                    : <>{confirmAction.cube.code}을<br />&lsquo;{confirmAction.targetSpace.name}&rsquo; 공간에 연결하시겠습니까?</>}
                </p>
              </>
            )}
            {confirmAction.type === "unassign" && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                연결을 해제하면 이 QR은 더 이상 현재 공간으로 이동하지 않습니다.<br />
                큐브 자체와 QR 코드는 삭제되지 않습니다.
              </p>
            )}
            {confirmAction.type === "disable" && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                {confirmAction.cube.code}를 비활성화하면 연결이 함께 해제되고, QR을 스캔해도 더 이상 공간으로 이동하지 않습니다.<br />
                필요하면 나중에 다시 활성화할 수 있습니다.
              </p>
            )}
            {confirmAction.type === "delete" && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
                {confirmAction.cube.code}를 삭제하면 되돌릴 수 없습니다.<br />
                이미 인쇄한 QR이 있다면 더 이상 사용할 수 없습니다.
              </p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} disabled={busy} className="flex-1 py-2.5 text-sm border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                취소
              </button>
              <button
                type="button"
                onClick={runConfirm}
                disabled={busy}
                className="flex-1 py-2.5 text-sm border disabled:opacity-40"
                style={confirmAction.type === "disable" || confirmAction.type === "delete" ? { borderColor: "#ef4444", color: "#ef4444" } : { borderColor: "var(--fg)" }}
              >
                {busy ? "처리 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-sm border max-w-[90vw] text-center" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 p-3 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>{label}</p>
      <p className="text-xl font-bold leading-none">{value}</p>
    </div>
  );
}
