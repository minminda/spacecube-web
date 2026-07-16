"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";
import { formatDotDate } from "@/lib/time";
import { FONT_SIZE_PRESETS, COLOR_PRESETS, isValidHexColor } from "@/lib/guestbookClusterStyle";
import { DEFAULT_SESSION_FIELDS, type GuestbookSessionInput } from "@/lib/guestbookSessionInput";
import GuestbookSessionPreview, { type PreviewCluster, type PreviewClusterKey } from "./GuestbookSessionPreview";

type SessionEditableFields = GuestbookSessionInput;

const DEFAULT_POSITIONS = {
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
};

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

interface ActiveSummary {
  id: string;
  startsAt: string | null;
  fields: SessionEditableFields;
}
interface DraftSummary {
  id: string;
  fields: SessionEditableFields;
}
interface ArchivedSummary {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  question1: string | null;
  question2: string | null;
  noteCount: number;
}

interface Props {
  spaceId: string;
  spaceSlug: string;
  active: ActiveSummary | null;
  activePostitCount: number;
  draft: DraftSummary | null;
  archived: ArchivedSummary[];
}

type Mode = "active" | "draft";

export default function GuestbookSessionManager({ spaceId, spaceSlug, active, activePostitCount, draft, archived }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(active ? "active" : "draft");
  const [activeFields, setActiveFields] = useState<SessionEditableFields | null>(active?.fields ?? null);
  const [draftFields, setDraftFields] = useState<SessionEditableFields>(draft?.fields ?? DEFAULT_SESSION_FIELDS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  const fields = mode === "active" ? activeFields : draftFields;

  function set<K extends keyof SessionEditableFields>(key: K, value: SessionEditableFields[K]) {
    if (mode === "active") {
      setActiveFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    } else {
      setDraftFields((prev) => ({ ...prev, [key]: value }));
    }
  }

  function handleDrag(key: PreviewClusterKey, x: number, y: number) {
    if (key === "free") {
      set("freeClusterX", x);
      set("freeClusterY", y);
    } else if (key === "q1") {
      set("question1ClusterX", x);
      set("question1ClusterY", y);
    } else {
      set("question2ClusterX", x);
      set("question2ClusterY", y);
    }
  }

  function resetPositions() {
    if (mode === "active") {
      setActiveFields((prev) => (prev ? { ...prev, ...DEFAULT_POSITIONS } : prev));
    } else {
      setDraftFields((prev) => ({ ...prev, ...DEFAULT_POSITIONS }));
    }
  }

  function cancel() {
    setError(null);
    if (mode === "active") setActiveFields(active?.fields ?? null);
    else setDraftFields(draft?.fields ?? DEFAULT_SESSION_FIELDS);
  }

  async function save() {
    if (!fields) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const url = mode === "active"
      ? `/api/spaces/${spaceId}/guestbook-sessions/active`
      : `/api/spaces/${spaceId}/guestbook-sessions/draft`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "저장에 실패했습니다.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function startNewSession() {
    setActivating(true);
    setError(null);
    const res = await fetch(`/api/spaces/${spaceId}/guestbook-sessions/activate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setActivating(false);
    if (!res.ok) {
      setError(data.error ?? "시작에 실패했습니다.");
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  const previewClusters: PreviewCluster[] = fields
    ? [
        {
          key: "free", type: "FREE", label: "자유롭게 남겨주세요",
          fontSize: fields.freeLabelFontSize, color: fields.freeLabelColor,
          visible: fields.freeLabelVisible, x: fields.freeClusterX, y: fields.freeClusterY,
        },
        {
          key: "q1", type: "QUESTION_1", label: fields.question1 || "(질문 1 없음)",
          fontSize: fields.question1FontSize, color: fields.question1Color,
          visible: !!fields.question1 && fields.question1Visible, x: fields.question1ClusterX, y: fields.question1ClusterY,
        },
        {
          key: "q2", type: "QUESTION_2", label: fields.question2 || "(질문 2 없음)",
          fontSize: fields.question2FontSize, color: fields.question2Color,
          visible: !!fields.question2 && fields.question2Visible, x: fields.question2ClusterX, y: fields.question2ClusterY,
        },
      ]
    : [];

  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" } as const;

  return (
    <div className="flex flex-col gap-8">
      {/* ── 현재 활성 방명록 요약(항상 표시, 읽기 전용) ── */}
      <section className="space-y-3">
        <p className={labelClass} style={labelStyle}>현재 활성 방명록</p>
        {!active ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>진행 중인 방명록이 없습니다. 아래에서 다음 방명록을 준비해 시작해주세요.</p>
        ) : (
          <div className="p-4 border space-y-2 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between items-baseline">
              <span className="font-medium">상태: ACTIVE</span>
              <span className="text-xs" style={{ color: "var(--dim)" }}>시작일 {formatDotDate(active.startsAt)}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--dim)" }}>포스트잇 {activePostitCount}개</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>질문1: {active.fields.question1 ?? "(없음)"} {!active.fields.question1Visible && "(숨김)"}</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>질문2: {active.fields.question2 ?? "(없음)"} {!active.fields.question2Visible && "(숨김)"}</p>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              자유 {active.fields.freeLabelFontSize}px/{active.fields.freeLabelColor} · 질문1 {active.fields.question1FontSize}px/{active.fields.question1Color} · 질문2 {active.fields.question2FontSize}px/{active.fields.question2Color}
            </p>
          </div>
        )}
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ── 모드 전환 ── */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => active && setMode("active")}
          disabled={!active}
          className="text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
          style={{
            borderColor: mode === "active" ? "var(--fg)" : "var(--border)",
            background: mode === "active" ? "var(--fg)" : "transparent",
            color: mode === "active" ? "var(--bg)" : "var(--dim)",
          }}
        >
          현재 방명록 수정
        </button>
        <button
          type="button"
          onClick={() => setMode("draft")}
          className="text-xs px-3 py-1.5 border transition-colors"
          style={{
            borderColor: mode === "draft" ? "var(--fg)" : "var(--border)",
            background: mode === "draft" ? "var(--fg)" : "transparent",
            color: mode === "draft" ? "var(--bg)" : "var(--dim)",
          }}
        >
          다음 방명록 준비
        </button>
      </div>

      {fields && (
        <>
          {/* ── 질문 내용 ── */}
          <div className="space-y-4">
            <p className={labelClass} style={labelStyle}>질문 내용</p>

            <div className="flex items-center gap-2 px-3 py-2.5 border" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm flex-1">자유롭게 남겨주세요 (고정 문구)</span>
              <ToggleSwitch label="표시" checked={fields.freeLabelVisible} onChange={(v) => set("freeLabelVisible", v)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "var(--dim)" }}>질문 1</label>
                <ToggleSwitch label="표시" checked={fields.question1Visible} onChange={(v) => set("question1Visible", v)} />
              </div>
              <input
                value={fields.question1 ?? ""}
                onChange={(e) => set("question1", e.target.value)}
                placeholder="오늘 가장 기억에 남는 순간은?"
                className="w-full text-sm px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "var(--dim)" }}>질문 2</label>
                <ToggleSwitch label="표시" checked={fields.question2Visible} onChange={(v) => set("question2Visible", v)} />
              </div>
              <input
                value={fields.question2 ?? ""}
                onChange={(e) => set("question2", e.target.value)}
                placeholder="요즘 가장 자주 듣는 노래는?"
                className="w-full text-sm px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--border)" }}>
              질문 내용이 비어 있거나 표시를 꺼두면 방문자 방명록에 나타나지 않습니다.
            </p>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* ── 크기/색상 ── */}
          <div className="space-y-5">
            <p className={labelClass} style={labelStyle}>군집별 글자 크기 · 색상</p>

            <ClusterStyleFields
              title="자유 영역"
              fontSize={fields.freeLabelFontSize}
              color={fields.freeLabelColor}
              onFontSize={(v) => set("freeLabelFontSize", v)}
              onColor={(v) => set("freeLabelColor", v)}
            />
            <ClusterStyleFields
              title="질문 1"
              fontSize={fields.question1FontSize}
              color={fields.question1Color}
              onFontSize={(v) => set("question1FontSize", v)}
              onColor={(v) => set("question1Color", v)}
            />
            <ClusterStyleFields
              title="질문 2"
              fontSize={fields.question2FontSize}
              color={fields.question2Color}
              onFontSize={(v) => set("question2FontSize", v)}
              onColor={(v) => set("question2Color", v)}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* ── 위치 + 실시간 미리보기 ── */}
          <div className="space-y-3">
            <p className={labelClass} style={labelStyle}>배치 미리보기</p>
            <GuestbookSessionPreview clusters={previewClusters} onDragCluster={handleDrag} />
            <div className="grid grid-cols-3 gap-3 text-xs" style={{ color: "var(--dim)" }}>
              <p>자유 X {Math.round(fields.freeClusterX)} / Y {Math.round(fields.freeClusterY)}</p>
              <p>질문1 X {Math.round(fields.question1ClusterX)} / Y {Math.round(fields.question1ClusterY)}</p>
              <p>질문2 X {Math.round(fields.question2ClusterX)} / Y {Math.round(fields.question2ClusterY)}</p>
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={resetPositions}
              className="text-sm px-4 py-2.5 border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              배치 초기화
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-sm px-4 py-2.5 border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
              style={{ borderColor: "var(--fg)" }}
            >
              {saving ? "저장 중..." : saved ? "저장됨 ✓" : mode === "active" ? "현재 설정 저장" : "임시 저장"}
            </button>

            {mode === "draft" && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!draft}
                className="text-sm px-4 py-2.5 border transition-colors disabled:opacity-30"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                새 방명록 시작
              </button>
            )}
          </div>
          {mode === "draft" && !draft && (
            <p className="text-xs" style={{ color: "var(--border)" }}>질문을 먼저 임시 저장하면 시작할 수 있어요.</p>
          )}
        </>
      )}

      {/* ── 새 방명록 시작 확인 모달 ── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="w-full max-w-xs p-6 space-y-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-sm leading-relaxed">
              새 방명록을 시작하면 현재 방명록에는 더 이상 글을 작성할 수 없습니다. 기존 기록은 그대로 보관됩니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={activating}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={startNewSession}
                disabled={activating}
                className="flex-1 text-xs py-2 border"
                style={{ borderColor: "var(--fg)" }}
              >
                {activating ? "시작 중..." : "시작하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ── 이전 방명록 (읽기 전용, 기존 방문자용 아카이브 라우트로 링크) ── */}
      <section className="space-y-3">
        <p className={labelClass} style={labelStyle}>이전 방명록</p>
        {archived.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>아직 종료된 방명록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {archived.map((s) => (
              <div key={s.id} className="p-3 border flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm">{formatDotDate(s.startsAt)} – {formatDotDate(s.endsAt)}</p>
                  <p className="text-xs truncate" style={{ color: "var(--dim)" }}>
                    {[s.question1, s.question2].filter(Boolean).join(" · ") || "질문 없음"} · 포스트잇 {s.noteCount}개
                  </p>
                </div>
                <Link
                  href={`/space/${spaceSlug}/guestbook/archive/${s.id}`}
                  className="text-xs flex-shrink-0 underline underline-offset-2"
                  style={{ color: "var(--dim)" }}
                >
                  읽기 →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ClusterStyleFields({
  title, fontSize, color, onFontSize, onColor,
}: {
  title: string;
  fontSize: number;
  color: string;
  onFontSize: (v: number) => void;
  onColor: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5 p-3 border" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-medium">{title}</p>

      <div className="flex gap-2 flex-wrap">
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
      </div>

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
    </div>
  );
}
