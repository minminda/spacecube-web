"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";
import { formatDotDate } from "@/lib/time";
import { DEFAULT_SESSION_FIELDS, type GuestbookSessionInput } from "@/lib/guestbookSessionInput";
import GuestbookSessionPreview, { type PreviewCluster, type PreviewClusterKey } from "./GuestbookSessionPreview";
import ClusterStyleFields from "@/components/guestbook/ClusterStyleFields";

/* ── 관리자 방명록 통합 관리 페이지 ────────────────────────────────────
   예전엔 /admin/[id]/guestbook-settings(배경·레이아웃)와 /admin/[id]/guestbook-sessions
   (질문·군집 위치·스타일)로 나뉘어 있던 두 화면을 탭 하나로 합쳤다 — 별도 라우트로
   분리하지 않고 같은 페이지 안에서 "현재 방명록 / 다음 방명록 준비 / 지난 방명록 /
   화면 설정"을 오간다. 데이터도 page.tsx가 한 번에 조회해 페이지 이동 시 중복
   API 호출이 없다. ──────────────────────────────────────────────── */

type SessionEditableFields = GuestbookSessionInput;

const DEFAULT_POSITIONS = {
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
};

interface GuestbookSettingsFields {
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

const LAYOUT_LABELS: Record<GuestbookSettingsFields["layoutType"], string> = {
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
  settings: GuestbookSettingsFields;
  hasCustomSettings: boolean;
  /** 파일럿 플래그 — 방명록 이미지 첨부 허용 여부. off면 "포스트잇 사진 허용" 설정을 숨긴다. */
  enableImage: boolean;
}

type Tab = "active" | "draft" | "archived" | "settings";

export default function GuestbookAdminPage({
  spaceId, spaceSlug, active, activePostitCount, draft, archived, settings, hasCustomSettings, enableImage,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(active ? "active" : "draft");
  const [activeFields, setActiveFields] = useState<SessionEditableFields | null>(active?.fields ?? null);
  const [draftFields, setDraftFields] = useState<SessionEditableFields>(draft?.fields ?? DEFAULT_SESSION_FIELDS);
  const [settingsFields, setSettingsFields] = useState<GuestbookSettingsFields>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  const sessionFields = tab === "active" ? activeFields : tab === "draft" ? draftFields : null;

  function setSessionField<K extends keyof SessionEditableFields>(key: K, value: SessionEditableFields[K]) {
    if (tab === "active") {
      setActiveFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    } else if (tab === "draft") {
      setDraftFields((prev) => ({ ...prev, [key]: value }));
    }
  }

  function setSettingsField<K extends keyof GuestbookSettingsFields>(key: K, value: GuestbookSettingsFields[K]) {
    setSettingsFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleDrag(key: PreviewClusterKey, x: number, y: number) {
    if (key === "free") {
      setSessionField("freeClusterX", x);
      setSessionField("freeClusterY", y);
    } else if (key === "q1") {
      setSessionField("question1ClusterX", x);
      setSessionField("question1ClusterY", y);
    } else {
      setSessionField("question2ClusterX", x);
      setSessionField("question2ClusterY", y);
    }
  }

  function resetPositions() {
    if (tab === "active") {
      setActiveFields((prev) => (prev ? { ...prev, ...DEFAULT_POSITIONS } : prev));
    } else if (tab === "draft") {
      setDraftFields((prev) => ({ ...prev, ...DEFAULT_POSITIONS }));
    }
  }

  function cancel() {
    setError(null);
    if (tab === "active") setActiveFields(active?.fields ?? null);
    else if (tab === "draft") setDraftFields(draft?.fields ?? DEFAULT_SESSION_FIELDS);
    else if (tab === "settings") setSettingsFields(settings);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    let url: string;
    let body: unknown;
    if (tab === "active") {
      url = `/api/spaces/${spaceId}/guestbook-sessions/active`;
      body = activeFields;
    } else if (tab === "draft") {
      url = `/api/spaces/${spaceId}/guestbook-sessions/draft`;
      body = draftFields;
    } else if (tab === "settings") {
      url = `/api/spaces/${spaceId}/guestbook-settings`;
      body = settingsFields;
    } else {
      setSaving(false);
      return;
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const previewClusters: PreviewCluster[] = sessionFields
    ? [
        {
          key: "free", type: "FREE", label: "자유롭게 남겨주세요",
          fontSize: sessionFields.freeLabelFontSize, color: sessionFields.freeLabelColor,
          visible: sessionFields.freeLabelVisible, x: sessionFields.freeClusterX, y: sessionFields.freeClusterY,
        },
        {
          key: "q1", type: "QUESTION_1", label: sessionFields.question1 || "(질문 1 없음)",
          fontSize: sessionFields.question1FontSize, color: sessionFields.question1Color,
          visible: !!sessionFields.question1 && sessionFields.question1Visible,
          x: sessionFields.question1ClusterX, y: sessionFields.question1ClusterY,
        },
        {
          key: "q2", type: "QUESTION_2", label: sessionFields.question2 || "(질문 2 없음)",
          fontSize: sessionFields.question2FontSize, color: sessionFields.question2Color,
          visible: !!sessionFields.question2 && sessionFields.question2Visible,
          x: sessionFields.question2ClusterX, y: sessionFields.question2ClusterY,
        },
      ]
    : [];

  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" } as const;

  const TABS: { key: Tab; label: string }[] = [
    { key: "active", label: "현재 방명록" },
    { key: "draft", label: "다음 방명록 준비" },
    { key: "archived", label: "지난 방명록" },
    { key: "settings", label: "화면 설정" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── A. 공간 정보(항상 표시) ── */}
      <section className="space-y-3">
        <p className={labelClass} style={labelStyle}>공간 정보</p>
        {!active ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>진행 중인 방명록이 없습니다. &quot;다음 방명록 준비&quot; 탭에서 새로 시작해주세요.</p>
        ) : (
          <div className="p-4 border space-y-1 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between items-baseline">
              <span className="font-medium">상태: ACTIVE</span>
              <span className="text-xs" style={{ color: "var(--dim)" }}>시작일 {formatDotDate(active.startsAt)}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--dim)" }}>포스트잇 {activePostitCount}개</p>
          </div>
        )}
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* ── 탭 ── */}
      <div className="flex gap-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => (t.key !== "active" || active) && setTab(t.key)}
            disabled={t.key === "active" && !active}
            className="text-xs px-3 py-1.5 border transition-colors disabled:opacity-30"
            style={{
              borderColor: tab === t.key ? "var(--fg)" : "var(--border)",
              background: tab === t.key ? "var(--fg)" : "transparent",
              color: tab === t.key ? "var(--bg)" : "var(--dim)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── B/C. 현재 방명록 · 다음 방명록 준비(세션 편집 폼 공용) ── */}
      {sessionFields && (
        <>
          <div className="space-y-4">
            <p className={labelClass} style={labelStyle}>질문 내용</p>

            <div className="flex items-center gap-2 px-3 py-2.5 border" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm flex-1">자유롭게 남겨주세요 (고정 문구)</span>
              <ToggleSwitch label="표시" checked={sessionFields.freeLabelVisible} onChange={(v) => setSessionField("freeLabelVisible", v)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "var(--dim)" }}>질문 1</label>
                <ToggleSwitch label="표시" checked={sessionFields.question1Visible} onChange={(v) => setSessionField("question1Visible", v)} />
              </div>
              <input
                value={sessionFields.question1 ?? ""}
                onChange={(e) => setSessionField("question1", e.target.value)}
                placeholder="오늘 가장 기억에 남는 순간은?"
                className="w-full text-sm px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "var(--dim)" }}>질문 2</label>
                <ToggleSwitch label="표시" checked={sessionFields.question2Visible} onChange={(v) => setSessionField("question2Visible", v)} />
              </div>
              <input
                value={sessionFields.question2 ?? ""}
                onChange={(e) => setSessionField("question2", e.target.value)}
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

          <div className="space-y-5">
            <div className="space-y-1">
              <p className={labelClass} style={labelStyle}>군집별 글자 크기 · 색상</p>
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                질문 1·질문 2의 글자 크기·색상은 운영자도 자신의 운영 페이지에서 바꿀 수 있습니다.
              </p>
            </div>

            <ClusterStyleFields
              title="자유 영역"
              fontSize={sessionFields.freeLabelFontSize}
              color={sessionFields.freeLabelColor}
              onFontSize={(v) => setSessionField("freeLabelFontSize", v)}
              onColor={(v) => setSessionField("freeLabelColor", v)}
            />
            <ClusterStyleFields
              title="질문 1"
              fontSize={sessionFields.question1FontSize}
              color={sessionFields.question1Color}
              onFontSize={(v) => setSessionField("question1FontSize", v)}
              onColor={(v) => setSessionField("question1Color", v)}
            />
            <ClusterStyleFields
              title="질문 2"
              fontSize={sessionFields.question2FontSize}
              color={sessionFields.question2Color}
              onFontSize={(v) => setSessionField("question2FontSize", v)}
              onColor={(v) => setSessionField("question2Color", v)}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-3">
            <p className={labelClass} style={labelStyle}>배치 미리보기</p>
            <GuestbookSessionPreview clusters={previewClusters} onDragCluster={handleDrag} />
            <div className="grid grid-cols-3 gap-3 text-xs" style={{ color: "var(--dim)" }}>
              <p>자유 X {Math.round(sessionFields.freeClusterX)} / Y {Math.round(sessionFields.freeClusterY)}</p>
              <p>질문1 X {Math.round(sessionFields.question1ClusterX)} / Y {Math.round(sessionFields.question1ClusterY)}</p>
              <p>질문2 X {Math.round(sessionFields.question2ClusterX)} / Y {Math.round(sessionFields.question2ClusterY)}</p>
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={resetPositions} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              배치 초기화
            </button>
            <button type="button" onClick={cancel} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              취소
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
              style={{ borderColor: "var(--fg)" }}
            >
              {saving ? "저장 중..." : saved ? "저장됨 ✓" : tab === "active" ? "현재 설정 저장" : "임시 저장"}
            </button>

            {tab === "draft" && (
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
          {tab === "draft" && !draft && (
            <p className="text-xs" style={{ color: "var(--border)" }}>질문을 먼저 임시 저장하면 시작할 수 있어요.</p>
          )}
        </>
      )}

      {/* ── D. 지난 방명록(읽기 전용) ── */}
      {tab === "archived" && (
        <section className="space-y-3">
          <p className={labelClass} style={labelStyle}>지난 방명록 (읽기 전용)</p>
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
      )}

      {/* ── 화면 설정(배경·레이아웃, 예전 guestbook-settings 페이지) ── */}
      {tab === "settings" && (
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
                background: settingsFields.backgroundType === "color" ? settingsFields.backgroundColor : "#000",
              }}
            >
              {settingsFields.backgroundType === "image" && settingsFields.backgroundImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settingsFields.backgroundImageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: settingsFields.backgroundOpacity }}
                />
              )}
              {(settingsFields.layoutType === "grid" ? GRID_POINTS : settingsFields.layoutType === "radial" ? RADIAL_POINTS : SCATTER_POINTS).map((p, i) => (
                <div
                  key={i}
                  className="absolute w-10 h-10 flex items-center justify-center text-[9px] shadow-sm"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%, -50%) rotate(${settingsFields.allowRotation ? p.r : 0}deg)`,
                    background: settingsFields.defaultPostitColor,
                    color: "#3d3524",
                  }}
                >
                  {i === 0 && settingsFields.showNickname ? "닉네임" : ""}
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              {LAYOUT_LABELS[settingsFields.layoutType]} · 회전 {settingsFields.allowRotation ? "허용" : "고정"}{enableImage ? ` · 사진 ${settingsFields.allowImage ? "허용" : "비허용"}` : ""} · 닉네임 {settingsFields.showNickname ? "표시" : "숨김"}
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
                  onClick={() => setSettingsField("backgroundType", t)}
                  className="text-xs px-3 py-1.5 border transition-colors"
                  style={{
                    borderColor: settingsFields.backgroundType === t ? "var(--fg)" : "var(--border)",
                    background: settingsFields.backgroundType === t ? "var(--fg)" : "transparent",
                    color: settingsFields.backgroundType === t ? "var(--bg)" : "var(--dim)",
                  }}
                >
                  {t === "color" ? "단색" : "이미지"}
                </button>
              ))}
            </div>

            {settingsFields.backgroundType === "color" ? (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settingsFields.backgroundColor}
                  onChange={(e) => setSettingsField("backgroundColor", e.target.value)}
                  className="w-10 h-10 border p-0 bg-transparent"
                  style={{ borderColor: "var(--border)" }}
                />
                <input
                  value={settingsFields.backgroundColor}
                  onChange={(e) => setSettingsField("backgroundColor", e.target.value)}
                  className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={settingsFields.backgroundImageUrl}
                  onChange={(e) => setSettingsField("backgroundImageUrl", e.target.value)}
                  placeholder="배경 이미지 URL"
                  className="w-full bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
                  style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs w-16 flex-shrink-0" style={{ color: "var(--dim)" }}>투명도</span>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={settingsFields.backgroundOpacity}
                    onChange={(e) => setSettingsField("backgroundOpacity", Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs w-10 text-right" style={{ color: "var(--dim)" }}>{Math.round(settingsFields.backgroundOpacity * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-3">
            <p className={labelClass} style={labelStyle}>레이아웃 프리셋</p>
            <div className="flex gap-3 flex-wrap">
              {(Object.keys(LAYOUT_LABELS) as GuestbookSettingsFields["layoutType"][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSettingsField("layoutType", t)}
                  className="text-xs px-3 py-1.5 border transition-colors"
                  style={{
                    borderColor: settingsFields.layoutType === t ? "var(--fg)" : "var(--border)",
                    background: settingsFields.layoutType === t ? "var(--fg)" : "transparent",
                    color: settingsFields.layoutType === t ? "var(--bg)" : "var(--dim)",
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
                value={settingsFields.defaultPostitColor}
                onChange={(e) => setSettingsField("defaultPostitColor", e.target.value)}
                className="w-10 h-10 border p-0 bg-transparent"
                style={{ borderColor: "var(--border)" }}
              />
              <input
                value={settingsFields.defaultPostitColor}
                onChange={(e) => setSettingsField("defaultPostitColor", e.target.value)}
                className="flex-1 bg-transparent border px-3 py-2 text-sm outline-none focus:border-[var(--fg)]"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-3">
            <p className={labelClass} style={labelStyle}>초기 카메라 위치 / 줌</p>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="줌" value={settingsFields.initialZoom} onChange={(v) => setSettingsField("initialZoom", v)} step={0.1} />
              <NumberField label="X" value={settingsFields.initialX} onChange={(v) => setSettingsField("initialX", v)} step={10} />
              <NumberField label="Y" value={settingsFields.initialY} onChange={(v) => setSettingsField("initialY", v)} step={10} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          <div className="space-y-3">
            <ToggleSwitch label="포스트잇 회전 허용" checked={settingsFields.allowRotation} onChange={(v) => setSettingsField("allowRotation", v)} />
            {enableImage && (
              <ToggleSwitch label="포스트잇 사진 허용" checked={settingsFields.allowImage} onChange={(v) => setSettingsField("allowImage", v)} />
            )}
            <ToggleSwitch label="작성자 닉네임 표시" checked={settingsFields.showNickname} onChange={(v) => setSettingsField("showNickname", v)} />
          </div>

          {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={cancel} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
              취소
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="py-3 px-4 text-sm font-medium border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--fg)" }}
            >
              {saving ? "저장 중..." : saved ? "저장됨 ✓" : "화면 설정 저장"}
            </button>
          </div>
        </div>
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
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={activating} className="flex-1 text-xs py-2 border" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
                취소
              </button>
              <button type="button" onClick={startNewSession} disabled={activating} className="flex-1 text-xs py-2 border" style={{ borderColor: "var(--fg)" }}>
                {activating ? "시작 중..." : "시작하기"}
              </button>
            </div>
          </div>
        </div>
      )}
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
