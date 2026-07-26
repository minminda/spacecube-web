"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDotDate } from "@/lib/time";
import { DEFAULT_SESSION_FIELDS, type GuestbookSessionInput } from "@/lib/guestbookSessionInput";
import { DEFAULT_CANVAS_SETTINGS, type GuestbookCanvasSettingsInput } from "@/lib/guestbookSettingsInput";
import GuestbookSessionFieldsEditor from "@/components/guestbook/GuestbookSessionFieldsEditor";
import GuestbookCanvasSettingsEditor from "@/components/guestbook/GuestbookCanvasSettingsEditor";
import GuestbookNoteManager from "@/components/guestbook/GuestbookNoteManager";
import type { PreviewClusterKey } from "@/components/guestbook/GuestbookSessionPreview";

/* ── 공통 GuestbookEditor ──────────────────────────────────────────────
   관리자(/admin/[id]/guestbook)와 운영자(/operator/[slug]/guestbook)가 완전히 같은
   컴포넌트와 저장 로직을 쓴다 — 권한과 진입 경로만 다르다.

     공통 GuestbookEditor
     ├─ role="admin"    → 5개 탭(현재/다음준비/지난/화면설정/방명록기록), 모든 공간 접근
     └─ role="operator" → 2개 탭(화면설정=현재세션+캔버스설정 통합/방명록기록), 자기 공간만

   세션 전환(DRAFT 준비·"새 방명록 시작")과 지난 방명록 아카이브는 운영자에게 노출하지
   않는다 — endpoints.draftSession/activateDraft/archived가 없으면(role="operator") 그
   탭 자체가 렌더링되지 않는다. ─────────────────────────────────────────────── */

const DEFAULT_POSITIONS = {
  freeClusterX: 2500,
  freeClusterY: 2500,
  question1ClusterX: 2000,
  question1ClusterY: 2200,
  question2ClusterX: 3000,
  question2ClusterY: 2800,
};

export interface GuestbookEditorNote {
  id: string;
  content: string;
  nickname: string | null;
  clusterType: string;
  createdAt: string;
  reactionCount: number;
  isHidden: boolean;
  isActive: boolean;
}

interface ActiveSummary {
  id: string;
  startsAt: string | null;
  fields: GuestbookSessionInput;
}
interface DraftSummary {
  id: string;
  fields: GuestbookSessionInput;
}
interface ArchivedSummary {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  question1: string | null;
  question2: string | null;
  noteCount: number;
}

interface Endpoints {
  /** PUT — 현재 ACTIVE 세션 저장 */
  activeSession: string;
  /** PUT — DRAFT 세션 저장(관리자 전용, 없으면 탭 자체가 안 보임) */
  draftSession?: string;
  /** POST — DRAFT를 ACTIVE로 전환(관리자 전용) */
  activateDraft?: string;
  /** PUT — GuestbookSettings(배경·레이아웃) 저장 */
  canvasSettings: string;
  /** GuestbookNoteManager가 붙일 base path (.../guestbook-notes/[id]) */
  notesBase: string;
}

interface Props {
  role: "admin" | "operator";
  spaceSlug: string;
  endpoints: Endpoints;
  active: ActiveSummary | null;
  activePostitCount: number;
  draft?: DraftSummary | null;
  archived?: ArchivedSummary[];
  settings: GuestbookCanvasSettingsInput;
  hasCustomSettings: boolean;
  enableImage: boolean;
  notes: GuestbookEditorNote[];
}

type AdminTab = "active" | "draft" | "archived" | "settings" | "records";
type OperatorTab = "screen" | "records";
type Tab = AdminTab | OperatorTab;

export default function GuestbookEditor({
  role, spaceSlug, endpoints, active, activePostitCount, draft, archived, settings, hasCustomSettings, enableImage, notes,
}: Props) {
  const router = useRouter();
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<Tab>(isAdmin ? (active ? "active" : "draft") : "screen");
  const [activeFields, setActiveFields] = useState<GuestbookSessionInput | null>(active?.fields ?? null);
  const [draftFields, setDraftFields] = useState<GuestbookSessionInput>(draft?.fields ?? DEFAULT_SESSION_FIELDS);
  const [settingsFields, setSettingsFields] = useState<GuestbookCanvasSettingsInput>(settings);

  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  // "screen"(운영자 통합 화면)은 항상 ACTIVE 세션을 편집한다.
  const sessionTabKind: "active" | "draft" | null =
    tab === "active" || tab === "screen" ? "active" : tab === "draft" ? "draft" : null;
  const sessionFields = sessionTabKind === "active" ? activeFields : sessionTabKind === "draft" ? draftFields : null;

  function setSessionField<K extends keyof GuestbookSessionInput>(key: K, value: GuestbookSessionInput[K]) {
    if (sessionTabKind === "active") {
      setActiveFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    } else if (sessionTabKind === "draft") {
      setDraftFields((prev) => ({ ...prev, [key]: value }));
    }
  }

  function setSettingsField<K extends keyof GuestbookCanvasSettingsInput>(key: K, value: GuestbookCanvasSettingsInput[K]) {
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
    if (sessionTabKind === "active") {
      setActiveFields((prev) => (prev ? { ...prev, ...DEFAULT_POSITIONS } : prev));
    } else if (sessionTabKind === "draft") {
      setDraftFields((prev) => ({ ...prev, ...DEFAULT_POSITIONS }));
    }
  }

  function cancelSession() {
    setSessionError(null);
    if (sessionTabKind === "active") setActiveFields(active?.fields ?? null);
    else if (sessionTabKind === "draft") setDraftFields(draft?.fields ?? DEFAULT_SESSION_FIELDS);
  }

  function cancelSettings() {
    setSettingsError(null);
    setSettingsFields(settings);
  }

  async function saveSession() {
    const url = sessionTabKind === "draft" ? endpoints.draftSession : endpoints.activeSession;
    const body = sessionTabKind === "draft" ? draftFields : activeFields;
    if (!url || !body) return;

    setSessionSaving(true);
    setSessionError(null);
    setSessionSaved(false);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSessionSaving(false);
    if (!res.ok) {
      setSessionError(data.error ?? "저장에 실패했습니다.");
      return;
    }
    setSessionSaved(true);
    router.refresh();
    setTimeout(() => setSessionSaved(false), 2000);
  }

  async function saveSettings() {
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    const res = await fetch(endpoints.canvasSettings, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsFields),
    });
    const data = await res.json().catch(() => ({}));
    setSettingsSaving(false);
    if (!res.ok) {
      setSettingsError(data.error ?? "저장에 실패했습니다.");
      return;
    }
    setSettingsSaved(true);
    router.refresh();
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function startNewSession() {
    if (!endpoints.activateDraft) return;
    setActivating(true);
    setSessionError(null);
    const res = await fetch(endpoints.activateDraft, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setActivating(false);
    if (!res.ok) {
      setSessionError(data.error ?? "시작에 실패했습니다.");
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  const labelClass = "text-xs uppercase tracking-widest";
  const labelStyle = { color: "var(--dim)" } as const;

  const TABS: { key: Tab; label: string; disabled?: boolean }[] = isAdmin
    ? [
        { key: "active", label: "현재 방명록", disabled: !active },
        { key: "draft", label: "다음 방명록 준비" },
        { key: "archived", label: "지난 방명록" },
        { key: "settings", label: "화면 설정" },
        { key: "records", label: "방명록 기록" },
      ]
    : [
        { key: "screen", label: "화면 설정" },
        { key: "records", label: "방명록 기록" },
      ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── 공간 정보(항상 표시) ── */}
      <section className="space-y-3">
        <p className={labelClass} style={labelStyle}>공간 정보</p>
        {!active ? (
          <p className="text-sm" style={{ color: "var(--dim)" }}>
            진행 중인 방명록이 없습니다{isAdmin ? ' — "다음 방명록 준비" 탭에서 새로 시작해주세요.' : "."}
          </p>
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
            onClick={() => !t.disabled && setTab(t.key)}
            disabled={t.disabled}
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

      {/* ── 현재/다음 방명록 세션 편집(관리자) · 화면 설정 앞부분(운영자) ── */}
      {sessionFields && (sessionTabKind === "active" || sessionTabKind === "draft") && (
        <GuestbookSessionFieldsEditor
          fields={sessionFields}
          onFieldChange={setSessionField}
          onDrag={handleDrag}
          onResetPositions={resetPositions}
          onCancel={cancelSession}
          onSave={saveSession}
          saving={sessionSaving}
          saved={sessionSaved}
          error={sessionError}
          saveLabel={tab === "draft" ? "임시 저장" : "현재 설정 저장"}
          activate={
            tab === "draft" && endpoints.activateDraft
              ? {
                  onActivate: () => setConfirmOpen(true),
                  activating,
                  disabled: !draft,
                  hint: !draft ? "질문을 먼저 임시 저장하면 시작할 수 있어요." : undefined,
                }
              : undefined
          }
        />
      )}

      {/* ── 운영자 "화면 설정" 탭: 캔버스 설정을 세션 편집 아래에 이어붙인다 ── */}
      {tab === "screen" && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <p className={labelClass} style={labelStyle}>배경 · 레이아웃</p>
          <GuestbookCanvasSettingsEditor
            fields={settingsFields}
            onFieldChange={setSettingsField}
            onCancel={cancelSettings}
            onSave={saveSettings}
            saving={settingsSaving}
            saved={settingsSaved}
            error={settingsError}
            hasCustomSettings={hasCustomSettings}
            enableImage={enableImage}
          />
        </>
      )}

      {/* ── 지난 방명록(관리자 전용, 읽기 전용) ── */}
      {tab === "archived" && archived && (
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

      {/* ── 화면 설정(관리자 전용 탭) ── */}
      {tab === "settings" && (
        <GuestbookCanvasSettingsEditor
          fields={settingsFields}
          onFieldChange={setSettingsField}
          onCancel={cancelSettings}
          onSave={saveSettings}
          saving={settingsSaving}
          saved={settingsSaved}
          error={settingsError}
          hasCustomSettings={hasCustomSettings}
          enableImage={enableImage}
        />
      )}

      {/* ── 방명록 기록(공통) ── */}
      {tab === "records" && (
        <GuestbookNoteManager apiBasePath={endpoints.notesBase} notes={notes} />
      )}

      {/* ── 새 방명록 시작 확인 모달(관리자 전용) ── */}
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
