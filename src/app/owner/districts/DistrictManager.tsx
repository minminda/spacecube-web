"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DistrictStatus } from "@prisma/client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import SeoulMapBackdrop, { SEOUL_MAP_VIEWBOX } from "@/components/SeoulMapBackdrop";

interface DistrictRow {
  id: string;
  name: string;
  slug: string;
  status: DistrictStatus;
  tagline: string;
  markerX: number;
  markerY: number;
  zoomX: number;
  zoomY: number;
  zoomScale: number;
  spaceCount: number;
}

type PatchPayload = Partial<Omit<DistrictRow, "id" | "spaceCount">>;
type LivePreview = Pick<DistrictRow, "markerX" | "markerY" | "status">;

const STATUS_LABEL: Record<DistrictStatus, string> = {
  ACTIVE: "ACTIVE — 선명하게 표시, 클릭 시 줌인 후 이동",
  COMING_SOON: "COMING_SOON — 흐리게 표시, 클릭 시 안내만",
  HIDDEN: "HIDDEN — 사용자 화면에 표시 안 함",
};

export default function DistrictManager({ initialDistricts }: { initialDistricts: DistrictRow[] }) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [preview, setPreview] = useState<Record<string, LivePreview>>({});
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast, showToast } = useToast();

  function updatePreview(id: string, partial: LivePreview) {
    setPreview((prev) => ({ ...prev, [id]: partial }));
  }

  async function createDistrict() {
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase();
    if (!name || !slug) return;
    setCreating(true);
    const res = await fetch("/api/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "생성에 실패했어요.");
      return;
    }
    const created = await res.json();
    setDistricts((prev) => [...prev, {
      id: created.id, name: created.name, slug: created.slug, status: created.status,
      tagline: created.tagline ?? "", markerX: created.markerX, markerY: created.markerY,
      zoomX: created.zoomX, zoomY: created.zoomY, zoomScale: created.zoomScale, spaceCount: 0,
    }]);
    setNewName("");
    setNewSlug("");
  }

  async function move(id: string, direction: "up" | "down") {
    const res = await fetch(`/api/districts/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) {
      setDistricts((prev) => {
        const i = prev.findIndex((d) => d.id === id);
        const j = direction === "up" ? i - 1 : i + 1;
        if (i === -1 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    } else {
      showToast("순서 변경에 실패했어요.");
    }
  }

  async function removeDistrict(district: DistrictRow) {
    const res = await fetch(`/api/districts/${district.id}`, { method: "DELETE" });
    if (res.ok) {
      setDistricts((prev) => prev.filter((d) => d.id !== district.id));
      setPreview((prev) => {
        const next = { ...prev };
        delete next[district.id];
        return next;
      });
      showToast("지역이 삭제되었습니다.");
    } else {
      showToast("삭제에 실패했어요.");
    }
  }

  async function patch(id: string, data: PatchPayload) {
    const res = await fetch(`/api/districts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setDistricts((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    } else {
      const resData = await res.json().catch(() => ({}));
      showToast(resData.error ?? "변경에 실패했어요.");
    }
    return res.ok;
  }

  const previewDistricts = districts.map((d) => ({ ...d, ...preview[d.id] }));

  return (
    <div className="flex flex-col gap-8">
      {/* ── 지도 미리보기 ── */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          미리보기 — 마커 위치·상태를 바꾸면 즉시 반영돼요. (도형은 편집 대상이 아니에요.)
        </p>
        <div className="border p-3" style={{ borderColor: "var(--border)" }}>
          <svg
            viewBox={SEOUL_MAP_VIEWBOX}
            width="100%"
            style={{ display: "block", maxWidth: 360, margin: "0 auto", color: "var(--fg)" }}
          >
            <SeoulMapBackdrop idSuffix="-admin" />
            {previewDistricts.map((d) => {
              const isActive = d.status === "ACTIVE";
              const isHidden = d.status === "HIDDEN";
              return (
                <g key={d.id} opacity={isHidden ? 0.3 : 1}>
                  <circle
                    cx={d.markerX} cy={d.markerY} r={isActive ? 5 : 3.5}
                    fill="currentColor" fillOpacity={isActive ? 0.85 : 0.25}
                    stroke="currentColor" strokeWidth={isActive ? 0 : 0.8}
                  />
                  <text
                    x={d.markerX} y={d.markerY - 9} textAnchor="middle" fontSize="7"
                    fill="currentColor" opacity={isActive ? 0.9 : 0.45}
                    style={{ fontFamily: "system-ui, sans-serif", fontWeight: isActive ? 600 : 400 }}
                  >
                    {d.name}
                  </text>
                  {/* 줌 중심점 — 마커 위치와 다를 때만 별도 표시 */}
                  {(d.zoomX !== d.markerX || d.zoomY !== d.markerY) && (
                    <circle cx={d.zoomX} cy={d.zoomY} r={1.6} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── 새 지역 추가 ── */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="지역명 (예: 홍대)"
          className="flex-1 min-w-[8rem] bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <input
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          placeholder="slug (예: hongdae)"
          className="flex-1 min-w-[8rem] bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <button
          onClick={createDistrict}
          disabled={creating || !newName.trim() || !newSlug.trim()}
          className="text-sm px-4 py-2 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {creating ? "추가 중..." : "+ 지역 추가"}
        </button>
      </div>

      <div className="space-y-3">
        {districts.map((district, i) => (
          <DistrictCard
            key={district.id}
            district={district}
            index={i}
            total={districts.length}
            onMove={(dir) => move(district.id, dir)}
            onPatch={(data) => patch(district.id, data)}
            onRemove={() => removeDistrict(district)}
            onLivePreview={(partial) => updatePreview(district.id, partial)}
          />
        ))}
      </div>

      <Toast message={toast} />
    </div>
  );
}

function DistrictCard({
  district, index, total, onMove, onPatch, onRemove, onLivePreview,
}: {
  district: DistrictRow;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onPatch: (data: PatchPayload) => Promise<boolean>;
  onRemove: () => void;
  onLivePreview: (partial: LivePreview) => void;
}) {
  const [name, setName] = useState(district.name);
  const [slug, setSlug] = useState(district.slug);
  const [tagline, setTagline] = useState(district.tagline);
  const [status, setStatus] = useState(district.status);
  const [markerX, setMarkerX] = useState(district.markerX);
  const [markerY, setMarkerY] = useState(district.markerY);
  const [zoomX, setZoomX] = useState(district.zoomX);
  const [zoomY, setZoomY] = useState(district.zoomY);
  const [zoomScale, setZoomScale] = useState(district.zoomScale);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const dirty =
    name !== district.name || slug !== district.slug || tagline !== district.tagline ||
    markerX !== district.markerX || markerY !== district.markerY ||
    zoomX !== district.zoomX || zoomY !== district.zoomY || zoomScale !== district.zoomScale;

  function handleMarkerXChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (!Number.isFinite(n)) return;
    setMarkerX(n);
    onLivePreview({ markerX: n, markerY, status });
  }
  function handleMarkerYChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (!Number.isFinite(n)) return;
    setMarkerY(n);
    onLivePreview({ markerX, markerY: n, status });
  }
  function handleZoomXChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) setZoomX(n);
  }
  function handleZoomYChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) setZoomY(n);
  }
  function handleZoomScaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) setZoomScale(n);
  }
  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const s = e.target.value as DistrictStatus;
    setStatus(s);
    onLivePreview({ markerX, markerY, status: s });
    const ok = await onPatch({ status: s });
    if (!ok) setStatus(district.status); // 실패 시 되돌리기
  }

  async function save() {
    setSaving(true);
    const ok = await onPatch({ name, slug, tagline, markerX, markerY, zoomX, zoomY, zoomScale });
    setSaving(false);
    if (ok) router.refresh();
  }

  return (
    <div className="p-4 border space-y-3" style={{ borderColor: "var(--border)", opacity: status === "HIDDEN" ? 0.55 : 1 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 text-xs">
          <button onClick={() => onMove("up")} disabled={index === 0} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▲</button>
          <button onClick={() => onMove("down")} disabled={index === total - 1} className="border px-2 py-1 disabled:opacity-30" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>▼</button>
        </div>
        <span className="text-xs" style={{ color: "var(--dim)" }}>연결된 공간 {district.spaceCount}개</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="지역명"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
        <input
          value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug"
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      </div>

      <input
        value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="지역 소개 한 줄 (선택)"
        className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
      />

      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
        상태
        <select
          value={status} onChange={handleStatusChange}
          className="bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        >
          {(Object.entries(STATUS_LABEL) as [DistrictStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
          마커 X
          <input type="number" value={markerX} onChange={handleMarkerXChange}
            className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
          마커 Y
          <input type="number" value={markerY} onChange={handleMarkerYChange}
            className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
          줌 중심 X
          <input type="number" value={zoomX} onChange={handleZoomXChange}
            className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
          줌 중심 Y
          <input type="number" value={zoomY} onChange={handleZoomYChange}
            className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--dim)" }}>
          줌 배율
          <input type="number" step="0.1" min="1" max="4" value={zoomScale} onChange={handleZoomScaleChange}
            className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]" style={{ borderColor: "var(--border)", color: "var(--fg)" }} />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onRemove}
          className="text-xs px-3 py-1 border transition-colors hover:border-red-500 hover:text-red-500"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          삭제
        </button>
        <button
          onClick={save}
          disabled={saving || !dirty || !name.trim() || !slug.trim()}
          className="text-xs px-3 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
