"use client";

/* ── 방명록 세션 편집 폼(질문 문구·표시여부·글자크기·색상·위치) ────────────────
   관리자의 "현재 방명록"/"다음 방명록 준비" 탭과 운영자의 "화면 설정" 탭이 이
   컴포넌트 하나를 그대로 쓴다 — 어떤 세션(ACTIVE/DRAFT)을 편집하는지, "새 방명록
   시작" 버튼을 보여줄지는 props로만 갈린다. ──────────────────────────────── */

import ToggleSwitch from "@/components/ToggleSwitch";
import ClusterStyleFields from "@/components/guestbook/ClusterStyleFields";
import GuestbookSessionPreview, { type PreviewCluster, type PreviewClusterKey } from "@/components/guestbook/GuestbookSessionPreview";
import type { GuestbookSessionInput } from "@/lib/guestbookSessionInput";

const labelClass = "text-xs uppercase tracking-widest";
const labelStyle = { color: "var(--dim)" } as const;

export interface ActivatePrompt {
  onActivate: () => void;
  activating: boolean;
  disabled: boolean;
  hint?: string;
}

interface Props {
  fields: GuestbookSessionInput;
  onFieldChange: <K extends keyof GuestbookSessionInput>(key: K, value: GuestbookSessionInput[K]) => void;
  onDrag: (key: PreviewClusterKey, x: number, y: number) => void;
  onResetPositions: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
  saveLabel: string;
  /** DRAFT 준비 탭(관리자 전용)에서만 전달 — 운영자/ACTIVE 탭에서는 undefined. */
  activate?: ActivatePrompt;
}

export default function GuestbookSessionFieldsEditor({
  fields, onFieldChange, onDrag, onResetPositions, onCancel, onSave, saving, saved, error, saveLabel, activate,
}: Props) {
  const previewClusters: PreviewCluster[] = [
    {
      key: "free", type: "FREE", label: "자유롭게 남겨주세요",
      fontSize: fields.freeLabelFontSize, color: fields.freeLabelColor,
      visible: fields.freeLabelVisible, x: fields.freeClusterX, y: fields.freeClusterY,
    },
    {
      key: "q1", type: "QUESTION_1", label: fields.question1 || "(질문 1 없음)",
      fontSize: fields.question1FontSize, color: fields.question1Color,
      visible: !!fields.question1 && fields.question1Visible,
      x: fields.question1ClusterX, y: fields.question1ClusterY,
    },
    {
      key: "q2", type: "QUESTION_2", label: fields.question2 || "(질문 2 없음)",
      fontSize: fields.question2FontSize, color: fields.question2Color,
      visible: !!fields.question2 && fields.question2Visible,
      x: fields.question2ClusterX, y: fields.question2ClusterY,
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <p className={labelClass} style={labelStyle}>질문 내용</p>

        <div className="flex items-center gap-2 px-3 py-2.5 border" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm flex-1">자유롭게 남겨주세요 (고정 문구)</span>
          <ToggleSwitch label="표시" checked={fields.freeLabelVisible} onChange={(v) => onFieldChange("freeLabelVisible", v)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--dim)" }}>질문 1</label>
            <ToggleSwitch label="표시" checked={fields.question1Visible} onChange={(v) => onFieldChange("question1Visible", v)} />
          </div>
          <input
            value={fields.question1 ?? ""}
            onChange={(e) => onFieldChange("question1", e.target.value)}
            placeholder="오늘 가장 기억에 남는 순간은?"
            className="w-full text-sm px-3 py-2.5 border bg-transparent"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "var(--dim)" }}>질문 2</label>
            <ToggleSwitch label="표시" checked={fields.question2Visible} onChange={(v) => onFieldChange("question2Visible", v)} />
          </div>
          <input
            value={fields.question2 ?? ""}
            onChange={(e) => onFieldChange("question2", e.target.value)}
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
        <p className={labelClass} style={labelStyle}>군집별 글자 크기 · 색상</p>

        <ClusterStyleFields
          title="자유 영역"
          fontSize={fields.freeLabelFontSize}
          color={fields.freeLabelColor}
          onFontSize={(v) => onFieldChange("freeLabelFontSize", v)}
          onColor={(v) => onFieldChange("freeLabelColor", v)}
        />
        <ClusterStyleFields
          title="질문 1"
          fontSize={fields.question1FontSize}
          color={fields.question1Color}
          onFontSize={(v) => onFieldChange("question1FontSize", v)}
          onColor={(v) => onFieldChange("question1Color", v)}
        />
        <ClusterStyleFields
          title="질문 2"
          fontSize={fields.question2FontSize}
          color={fields.question2Color}
          onFontSize={(v) => onFieldChange("question2FontSize", v)}
          onColor={(v) => onFieldChange("question2Color", v)}
        />
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      <div className="space-y-3">
        <p className={labelClass} style={labelStyle}>배치 미리보기</p>
        <GuestbookSessionPreview clusters={previewClusters} onDragCluster={onDrag} />
        <div className="grid grid-cols-3 gap-3 text-xs" style={{ color: "var(--dim)" }}>
          <p>자유 X {Math.round(fields.freeClusterX)} / Y {Math.round(fields.freeClusterY)}</p>
          <p>질문1 X {Math.round(fields.question1ClusterX)} / Y {Math.round(fields.question1ClusterY)}</p>
          <p>질문2 X {Math.round(fields.question2ClusterX)} / Y {Math.round(fields.question2ClusterY)}</p>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "#f66" }}>{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onResetPositions} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
          배치 초기화
        </button>
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2.5 border transition-colors" style={{ borderColor: "var(--border)", color: "var(--dim)" }}>
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-sm px-4 py-2.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : saveLabel}
        </button>

        {activate && (
          <button
            type="button"
            onClick={activate.onActivate}
            disabled={activate.disabled}
            className="text-sm px-4 py-2.5 border transition-colors disabled:opacity-30"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            {activate.activating ? "시작 중..." : "새 방명록 시작"}
          </button>
        )}
      </div>
      {activate?.hint && (
        <p className="text-xs" style={{ color: "var(--border)" }}>{activate.hint}</p>
      )}
    </>
  );
}
