"use client";

/* ── 방명록 질문 군집(자유/질문1/질문2) 글자 크기·색상 편집 폼 ────────────────
   관리자 페이지(/admin/[id]/guestbook)와 운영자 페이지(/operator/[spaceId]/guestbook)가
   공용 GuestbookEditor(src/components/guestbook/GuestbookEditor.tsx)를 통해 동일하게
   재사용한다. ──────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import {
  FONT_SIZE_PRESETS, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_RECOMMENDED_MIN, FONT_SIZE_RECOMMENDED_MAX,
  COLOR_PRESETS, isValidHexColor, isTooDarkForBlackBackground, clampFontSize,
} from "@/lib/guestbookClusterStyle";

const FONT_SIZE_LABELS: Record<keyof typeof FONT_SIZE_PRESETS, string> = {
  SMALL: "작게",
  MEDIUM: "보통",
  LARGE: "크게",
  XL: "매우 크게",
};

const COLOR_LABELS: Record<keyof typeof COLOR_PRESETS, string> = {
  WHITE: "White",
  LIGHT_GRAY: "Light Gray",
  YELLOW: "Yellow",
  SKY_BLUE: "Sky Blue",
  SOFT_PINK: "Soft Pink",
  MINT: "Mint",
};

export default function ClusterStyleFields({
  title, fontSize, color, onFontSize, onColor,
}: {
  title: string;
  fontSize: number;
  color: string;
  onFontSize: (v: number) => void;
  onColor: (v: string) => void;
}) {
  const [fontText, setFontText] = useState(String(fontSize));
  useEffect(() => { setFontText(String(fontSize)); }, [fontSize]);

  const tooDark = isValidHexColor(color) && isTooDarkForBlackBackground(color);

  return (
    <div className="space-y-2.5 p-3 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-medium">{title}</p>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--dim)" }}>글자 크기</p>
        <div className="flex gap-2 flex-wrap items-center">
          {(Object.keys(FONT_SIZE_PRESETS) as (keyof typeof FONT_SIZE_PRESETS)[]).map((key) => {
            const v = FONT_SIZE_PRESETS[key];
            const selected = fontSize === v;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFontSize(v)}
                className="text-xs px-2.5 py-1 border transition-colors"
                style={{
                  borderColor: selected ? "var(--fg)" : "var(--border)",
                  background: selected ? "var(--fg)" : "transparent",
                  color: selected ? "var(--bg)" : "var(--dim)",
                }}
              >
                {FONT_SIZE_LABELS[key]} {v}px
              </button>
            );
          })}
          <span className="text-xs" style={{ color: "var(--border)" }}>|</span>
          <span className="text-[10px]" style={{ color: "var(--dim)" }}>직접 입력</span>
          <input
            type="number"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={fontText}
            onChange={(e) => {
              const raw = e.target.value;
              setFontText(raw);
              if (raw === "") return;
              const n = Number(raw);
              if (Number.isFinite(n)) onFontSize(clampFontSize(n, fontSize));
            }}
            onBlur={() => {
              if (fontText === "" || !Number.isFinite(Number(fontText))) setFontText(String(fontSize));
            }}
            className="w-16 text-xs px-2 py-1 border bg-transparent text-center"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
          <span className="text-[10px]" style={{ color: "var(--dim)" }}>
            px ({FONT_SIZE_MIN}~{FONT_SIZE_MAX}, 권장 {FONT_SIZE_RECOMMENDED_MIN}~{FONT_SIZE_RECOMMENDED_MAX})
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--dim)" }}>글자 색상</p>
        <div className="flex gap-2 flex-wrap items-center">
          {(Object.keys(COLOR_PRESETS) as (keyof typeof COLOR_PRESETS)[]).map((key) => {
            const hex = COLOR_PRESETS[key];
            const selected = color.toUpperCase() === hex;
            return (
              <button
                key={key}
                type="button"
                title={COLOR_LABELS[key]}
                onClick={() => onColor(hex)}
                className="w-7 h-7 border-2"
                style={{ background: hex, borderColor: selected ? "var(--fg)" : "var(--border)" }}
              />
            );
          })}
          <input
            type="color"
            value={isValidHexColor(color) ? color : "#ffffff"}
            onChange={(e) => onColor(e.target.value)}
            className="w-8 h-8 border p-0 bg-transparent"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            value={color}
            onChange={(e) => onColor(e.target.value)}
            className="flex-1 min-w-[6rem] bg-transparent border px-2 py-1.5 text-xs outline-none focus:border-[var(--fg)]"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>
        {!isValidHexColor(color) && (
          <p className="text-[10px]" style={{ color: "#f0a850" }}>⚠ #RRGGBB 형식이 아니면 저장 시 기본 색상으로 대체됩니다.</p>
        )}
        {tooDark && (
          <p className="text-[10px]" style={{ color: "#f0a850" }}>⚠ 이 색상은 검정 배경에서 거의 보이지 않을 수 있습니다.</p>
        )}
      </div>
    </div>
  );
}
