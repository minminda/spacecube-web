"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DistrictStatus } from "@prisma/client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import SeoulMapBackdrop, { SEOUL_MAP_VIEWBOX } from "@/components/SeoulMapBackdrop";
import DistrictMapMarker from "@/components/DistrictMapMarker";

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

interface PositionDraft { markerX: number; markerY: number; zoomX: number; zoomY: number; }
type FieldPatch = Partial<Pick<DistrictRow, "name" | "slug" | "tagline" | "status" | "zoomScale" | "markerX" | "markerY" | "zoomX" | "zoomY">>;

const STATUS_LABEL: Record<DistrictStatus, string> = {
  ACTIVE: "ACTIVE — 선명하게 표시, 클릭 시 줌인 후 이동",
  COMING_SOON: "COMING_SOON — 흐리게 표시, 클릭 시 안내만",
  HIDDEN: "HIDDEN — 사용자 화면에 표시 안 함",
};

const VIEWBOX_W = 310;
const VIEWBOX_H = 390;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function DistrictManager({ initialDistricts }: { initialDistricts: DistrictRow[] }) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [positionDrafts, setPositionDrafts] = useState<Record<string, PositionDraft>>({});
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast, showToast } = useToast();

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const pointFromEvent = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp((clientX - rect.left) * (VIEWBOX_W / rect.width), 0, VIEWBOX_W),
      y: clamp((clientY - rect.top) * (VIEWBOX_H / rect.height), 0, VIEWBOX_H),
    };
  }, []);

  // 리스너를 자기 자신과 같은 참조로 떼어내야 해서 렌더마다 새로 만들지 않고 최초 1회만 생성한다
  // (GuestbookSessionPreview.tsx의 방명록 군집 드래그와 동일한 패턴).
  const [dragHandlers] = useState(() => {
    const move = (e: PointerEvent) => {
      const id = draggingIdRef.current;
      if (!id) return;
      const point = pointFromEvent(e.clientX, e.clientY);
      if (!point) return;
      // 줌 중심(zoomX/Y)은 별도 입력 없이 마커 위치를 그대로 따라간다.
      setPositionDrafts((prev) => ({
        ...prev,
        [id]: { markerX: point.x, markerY: point.y, zoomX: point.x, zoomY: point.y },
      }));
    };
    const stop = () => {
      draggingIdRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    return { move, stop };
  });

  function startDragging(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    draggingIdRef.current = id;
    window.addEventListener("pointermove", dragHandlers.move);
    window.addEventListener("pointerup", dragHandlers.stop);
  }

  function resetPosition(id: string) {
    setPositionDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
      resetPosition(district.id);
      showToast("지역이 삭제되었습니다.");
    } else {
      showToast("삭제에 실패했어요.");
    }
  }

  async function patch(id: string, data: FieldPatch) {
    const res = await fetch(`/api/districts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setDistricts((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
      resetPosition(id); // 저장 성공 시 임시 드래그 위치는 이제 district 쪽 값과 같으므로 정리
    } else {
      const resData = await res.json().catch(() => ({}));
      showToast(resData.error ?? "변경에 실패했어요.");
    }
    return res.ok;
  }

  const effectiveDistricts = districts.map((d) => ({ ...d, ...positionDrafts[d.id] }));

  return (
    <div className="flex flex-col gap-8">
      {/* ── 지도 위 드래그 편집 — 실제 사용자 화면(DiscoverEntry)과 동일한 마커 렌더 공유 ── */}
      <div className="space-y-2">
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          마커를 드래그해서 위치를 옮기세요. 줌 중심은 마커 위치를 그대로 따라가요.
        </p>
        <div className="border p-3" style={{ borderColor: "var(--border)", touchAction: "none" }}>
          <svg
            ref={svgRef}
            viewBox={SEOUL_MAP_VIEWBOX}
            width="100%"
            style={{ display: "block", maxWidth: 420, margin: "0 auto", color: "var(--fg)" }}
          >
            <SeoulMapBackdrop idSuffix="-admin" />
            {effectiveDistricts.map((d) => (
              <g
                key={d.id}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => startDragging(d.id, e)}
                style={{ touchAction: "none" }}
              >
                {/* 드래그 히트영역 확대 — 마커보다 넉넉한 투명 원 */}
                <circle cx={d.markerX} cy={d.markerY} r={22} fill="transparent" />
                <DistrictMapMarker name={d.name} x={d.markerX} y={d.markerY} status={d.status} />
              </g>
            ))}
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
            positionDraft={positionDrafts[district.id]}
            index={i}
            total={districts.length}
            onMove={(dir) => move(district.id, dir)}
            onPatch={(data) => patch(district.id, data)}
            onResetPosition={() => resetPosition(district.id)}
            onRemove={() => removeDistrict(district)}
          />
        ))}
      </div>

      <Toast message={toast} />
    </div>
  );
}

function DistrictCard({
  district, positionDraft, index, total, onMove, onPatch, onResetPosition, onRemove,
}: {
  district: DistrictRow;
  positionDraft?: PositionDraft;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onPatch: (data: FieldPatch) => Promise<boolean>;
  onResetPosition: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(district.name);
  const [slug, setSlug] = useState(district.slug);
  const [tagline, setTagline] = useState(district.tagline);
  const [status, setStatus] = useState(district.status);
  const [zoomScale, setZoomScale] = useState(district.zoomScale);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const effX = positionDraft?.markerX ?? district.markerX;
  const effY = positionDraft?.markerY ?? district.markerY;
  const hasPositionDraft = !!positionDraft;

  const dirty =
    name !== district.name || slug !== district.slug || tagline !== district.tagline ||
    zoomScale !== district.zoomScale || hasPositionDraft;

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const s = e.target.value as DistrictStatus;
    setStatus(s);
    const ok = await onPatch({ status: s });
    if (!ok) setStatus(district.status); // 실패 시 되돌리기
  }

  async function save() {
    setSaving(true);
    const ok = await onPatch({
      name, slug, tagline, zoomScale,
      markerX: effX,
      markerY: effY,
      zoomX: positionDraft?.zoomX ?? district.zoomX,
      zoomY: positionDraft?.zoomY ?? district.zoomY,
    });
    setSaving(false);
    if (ok) router.refresh();
  }

  function cancel() {
    setName(district.name);
    setSlug(district.slug);
    setTagline(district.tagline);
    setZoomScale(district.zoomScale);
    onResetPosition();
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

      {/* 위치 — 위쪽 지도에서 드래그로만 설정. 숫자 입력 필드는 없음 */}
      <div className="flex items-center justify-between gap-3 text-xs px-3 py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
        <span>현재 위치 ({Math.round(effX)}, {Math.round(effY)}){hasPositionDraft && " · 저장 전"}</span>
        <button
          type="button"
          onClick={onResetPosition}
          disabled={!hasPositionDraft}
          className="border px-2 py-1 disabled:opacity-30 transition-colors hover:border-[var(--fg)]"
          style={{ borderColor: "var(--border)" }}
        >
          위치 초기화
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs w-28" style={{ color: "var(--dim)" }}>
        줌 배율
        <input
          type="number" step="0.1" min="1" max="4" value={zoomScale}
          onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) setZoomScale(n); }}
          className="bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]"
          style={{ borderColor: "var(--border)", color: "var(--fg)" }}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          onClick={onRemove}
          className="text-xs px-3 py-1 border transition-colors hover:border-red-500 hover:text-red-500"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          삭제
        </button>
        <button
          onClick={cancel}
          disabled={!dirty}
          className="text-xs px-3 py-1 border transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
        >
          취소
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
