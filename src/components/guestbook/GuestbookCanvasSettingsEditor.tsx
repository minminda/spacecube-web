"use client";

/* ── 방명록 캔버스 설정(배경·레이아웃) 편집 폼 ────────────────────────────
   관리자의 "화면 설정" 탭과 운영자의 "화면 설정" 탭(질문 편집과 한 화면에 이어붙임)이
   이 컴포넌트 하나를 그대로 쓴다. ──────────────────────────────────────── */

import ToggleSwitch from "@/components/ToggleSwitch";
import type { GuestbookCanvasSettingsInput } from "@/lib/guestbookSettingsInput";

const labelClass = "text-xs uppercase tracking-widest";
const labelStyle = { color: "var(--dim)" } as const;

const LAYOUT_LABELS: Record<GuestbookCanvasSettingsInput["layoutType"], string> = {
  scatter: "자유 배치",
  grid: "격자 배치",
  radial: "중앙에서 바깥으로 확장",
};

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

interface Props {
  fields: GuestbookCanvasSettingsInput;
  onFieldChange: <K extends keyof GuestbookCanvasSettingsInput>(key: K, value: GuestbookCanvasSettingsInput[K]) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
  hasCustomSettings: boolean;
  enableImage: boolean;
}

export default function GuestbookCanvasSettingsEditor({
  fields, onFieldChange, onCancel, onSave, saving, saved, error, hasCustomSettings, enableImage,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      {!hasCustomSettings && (
        <p className="text-xs" style={{ color: "var(--border)" }}>
          아직 별도 설정이 없어 기본값(검정 배경 · 노란 포스트잇 · 자유 배치)을 사용 중입니다.
        </p>
      )}

      <div className="space-y-2">
        <p className={labelClass} style={labelStyle}>미리보기</p>
        <div
          className="relative w-full h-56 border overflow-hidden"
          style={{
            borderColor: "var(--border)",
            background: fields.backgroundType === "color" ? fields.backgroundColor : "#000",
          }}
        >
          {fields.backgroundType === "image" && fields.backgroundImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fields.backgroundImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: fields.backgroundOpacity }}
            />
          )}
          {(fields.layoutType === "grid" ? GRID_POINTS : fields.layoutType === "radial" ? RADIAL_POINTS : SCATTER_POINTS).map((p, i) => (
            <div
              key={i}
              className="absolute w-10 h-10 flex items-center justify-center text-[9px] shadow-sm"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${fields.allowRotation ? p.r : 0}deg)`,
                background: fields.defaultPostitColor,
                color: "#3d3524",
              }}
            >
              {i === 0 && fields.showNickname ? "닉네임" : ""}
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          {LAYOUT_LABELS[fields.layoutType]} · 회전 {fields.allowRotation ? "허용" : "고정"}{enableImage ? ` · 사진 ${fields.allowImage ? "허용" : "비허용"}` : ""} · 닉네임 {fields.showNickname ? "표시" : "숨김"}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>배경</p>
        <div className="flex gap-3">
          {(["color", "image"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onFieldChange("backgroundType", t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: fields.backgroundType === t ? "var(--fg)" : "var(--border)",
                background: fields.backgroundType === t ? "var(--fg)" : "transparent",
                color: fields.backgroundType === t ? "var(--bg)" : "var(--dim)",
              }}
            >
              {t === "color" ? "단색" : "이미지"}
            </button>
          ))}
        </div>

        {fields.backgroundType === "color" ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={fields.backgroundColor}
              onChange={(e) => onFieldChange("backgroundColor", e.target.value)}
              className="w-10 h-10 border p-0 bg-transparent"
              style={{ borderColor: "var(--border)" }}
            />
            <input
              value={fields.backgroundColor}
              onChange={(e) => onFieldChange("backgroundColor", e.target.value)}
              className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={fields.backgroundImageUrl}
              onChange={(e) => onFieldChange("backgroundImageUrl", e.target.value)}
              placeholder="배경 이미지 URL"
              className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            />
            <div className="flex items-center gap-3">
              <span className="text-xs w-16 flex-shrink-0" style={{ color: "var(--dim)" }}>투명도</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={fields.backgroundOpacity}
                onChange={(e) => onFieldChange("backgroundOpacity", Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs w-10 text-right" style={{ color: "var(--dim)" }}>{Math.round(fields.backgroundOpacity * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>레이아웃 프리셋</p>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(LAYOUT_LABELS) as GuestbookCanvasSettingsInput["layoutType"][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onFieldChange("layoutType", t)}
              className="text-xs px-3 py-1.5 border transition-colors"
              style={{
                borderColor: fields.layoutType === t ? "var(--fg)" : "var(--border)",
                background: fields.layoutType === t ? "var(--fg)" : "transparent",
                color: fields.layoutType === t ? "var(--bg)" : "var(--dim)",
              }}
            >
              {LAYOUT_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>기본 포스트잇 색상</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={fields.defaultPostitColor}
            onChange={(e) => onFieldChange("defaultPostitColor", e.target.value)}
            className="w-10 h-10 border p-0 bg-transparent"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            value={fields.defaultPostitColor}
            onChange={(e) => onFieldChange("defaultPostitColor", e.target.value)}
            className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>초기 카메라 위치 / 줌</p>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="줌" value={fields.initialZoom} onChange={(v) => onFieldChange("initialZoom", v)} step={0.1} />
          <NumberField label="X" value={fields.initialX} onChange={(v) => onFieldChange("initialX", v)} step={10} />
          <NumberField label="Y" value={fields.initialY} onChange={(v) => onFieldChange("initialY", v)} step={10} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <ToggleSwitch label="포스트잇 회전 허용" checked={fields.allowRotation} onChange={(v) => onFieldChange("allowRotation", v)} />
        {enableImage && (
          <ToggleSwitch label="포스트잇 사진 허용" checked={fields.allowImage} onChange={(v) => onFieldChange("allowImage", v)} />
        )}
        <ToggleSwitch label="작성자 닉네임 표시" checked={fields.showNickname} onChange={(v) => onFieldChange("showNickname", v)} />
      </div>

      {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
          취소
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="py-3 px-4 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "화면 설정 저장"}
        </button>
      </div>
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
