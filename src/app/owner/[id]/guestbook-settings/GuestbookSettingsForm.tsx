"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";

interface Settings {
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundOpacity: number;
  layoutType: "scatter" | "grid" | "radial";
  defaultPostitColor: string;
  initialZoom: number;
  initialX: number;
  initialY: number;
  allowRotation: boolean;
  allowImage: boolean;
  showNickname: boolean;
}

const LAYOUT_LABELS: Record<Settings["layoutType"], string> = {
  scatter: "자유 배치",
  grid: "격자 배치",
  radial: "중앙에서 바깥으로 확장",
};

// 프리뷰용 샘플 포스트잇 좌표 (레이아웃별로 다르게 배치)
const SCATTER_POINTS = [
  { x: 18, y: 24, r: -6 }, { x: 62, y: 15, r: 4 }, { x: 40, y: 45, r: 8 },
  { x: 78, y: 55, r: -3 }, { x: 12, y: 68, r: 5 }, { x: 55, y: 75, r: -8 },
];
const GRID_POINTS = [
  { x: 20, y: 25, r: 0 }, { x: 50, y: 25, r: 0 }, { x: 80, y: 25, r: 0 },
  { x: 20, y: 65, r: 0 }, { x: 50, y: 65, r: 0 }, { x: 80, y: 65, r: 0 },
];
const RADIAL_POINTS = [
  { x: 50, y: 50, r: 0 }, { x: 30, y: 35, r: -5 }, { x: 70, y: 35, r: 5 },
  { x: 30, y: 65, r: 4 }, { x: 70, y: 65, r: -4 }, { x: 50, y: 20, r: 2 },
];

export default function GuestbookSettingsForm({ spaceId, initial }: { spaceId: string; initial: Settings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/spaces/${spaceId}/guestbook-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" };
  const points = settings.layoutType === "grid" ? GRID_POINTS : settings.layoutType === "radial" ? RADIAL_POINTS : SCATTER_POINTS;

  return (
    <div className="flex flex-col gap-8">
      {/* 미리보기 */}
      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>미리보기</p>
        <div
          className="relative w-full h-56 border overflow-hidden"
          style={{
            borderColor: "var(--border)",
            background: settings.backgroundType === "color" ? settings.backgroundColor : "#000",
          }}
        >
          {settings.backgroundType === "image" && settings.backgroundImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.backgroundImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: settings.backgroundOpacity }}
            />
          )}
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute w-10 h-10 flex items-center justify-center text-[9px] shadow-sm"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${settings.allowRotation ? p.r : 0}deg)`,
                background: settings.defaultPostitColor,
                color: "#3d3524",
              }}
            >
              {i === 0 && settings.showNickname ? "닉네임" : ""}
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          {LAYOUT_LABELS[settings.layoutType]} · 회전 {settings.allowRotation ? "허용" : "고정"} · 사진 {settings.allowImage ? "허용" : "비허용"} · 닉네임 {settings.showNickname ? "표시" : "숨김"}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 배경 */}
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>배경</p>
        <div className="flex gap-3">
          {(["color", "image"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("backgroundType", t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: settings.backgroundType === t ? "var(--fg)" : "var(--border)",
                background: settings.backgroundType === t ? "var(--fg)" : "transparent",
                color: settings.backgroundType === t ? "var(--bg)" : "var(--dim)",
              }}
            >
              {t === "color" ? "단색" : "이미지"}
            </button>
          ))}
        </div>

        {settings.backgroundType === "color" ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => set("backgroundColor", e.target.value)}
              className="w-10 h-10 border p-0 bg-transparent"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              value={settings.backgroundColor}
              onChange={(e) => set("backgroundColor", e.target.value)}
              className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={settings.backgroundImageUrl}
              onChange={(e) => set("backgroundImageUrl", e.target.value)}
              placeholder="배경 이미지 URL"
              className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
            <div className="flex items-center gap-3">
              <span className="text-xs w-16 flex-shrink-0" style={{ color: "var(--dim)" }}>투명도</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.backgroundOpacity}
                onChange={(e) => set("backgroundOpacity", Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs w-10 text-right" style={{ color: "var(--dim)" }}>{Math.round(settings.backgroundOpacity * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 레이아웃 프리셋 */}
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>레이아웃 프리셋</p>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(LAYOUT_LABELS) as Settings["layoutType"][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("layoutType", t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: settings.layoutType === t ? "var(--fg)" : "var(--border)",
                background: settings.layoutType === t ? "var(--fg)" : "transparent",
                color: settings.layoutType === t ? "var(--bg)" : "var(--dim)",
              }}
            >
              {LAYOUT_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 포스트잇 기본 설정 */}
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>기본 포스트잇 색상</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.defaultPostitColor}
            onChange={(e) => set("defaultPostitColor", e.target.value)}
            className="w-10 h-10 border p-0 bg-transparent"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            value={settings.defaultPostitColor}
            onChange={(e) => set("defaultPostitColor", e.target.value)}
            className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 초기 카메라 */}
      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>초기 카메라 위치 / 줌</p>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="줌" value={settings.initialZoom} onChange={(v) => set("initialZoom", v)} step={0.1} />
          <NumberField label="X" value={settings.initialX} onChange={(v) => set("initialX", v)} step={10} />
          <NumberField label="Y" value={settings.initialY} onChange={(v) => set("initialY", v)} step={10} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* 토글 옵션 */}
      <div className="space-y-3">
        <ToggleSwitch label="포스트잇 회전 허용" checked={settings.allowRotation} onChange={(v) => set("allowRotation", v)} />
        <ToggleSwitch label="포스트잇 사진 허용" checked={settings.allowImage} onChange={(v) => set("allowImage", v)} />
        <ToggleSwitch label="작성자 닉네임 표시" checked={settings.showNickname} onChange={(v) => set("showNickname", v)} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="py-3 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
        style={{ borderColor: "var(--fg)" }}
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "방명록 설정 저장"}
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs" style={{ color: "var(--dim)" }}>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent border px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]"
        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
      />
    </label>
  );
}

