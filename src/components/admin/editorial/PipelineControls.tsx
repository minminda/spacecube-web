"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/ui";
import {
  EDITORIAL_STAGES, PRIORITY_LABEL, STAGE_LABEL,
  type EditorialPriorityValue, type EditorialStageValue, type PipelineKind,
} from "@/lib/editorial/pipeline";

const STAGE_TONE = { IDEA: "neutral", CONTACTING: "draft", PRODUCING: "draft", REVIEW: "warn", SCHEDULED: "static", PUBLISHED: "live" } as const;

export function StageBadge({ stage }: { stage: EditorialStageValue | null }) {
  if (!stage) return <StatusBadge tone="off">보관</StatusBadge>;
  return <StatusBadge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage].ko}</StatusBadge>;
}

export function PriorityText({ priority }: { priority: EditorialPriorityValue }) {
  return (
    <span className="text-xs font-medium" style={{ color: priority === "HIGH" ? "var(--a-danger)" : priority === "LOW" ? "var(--a-faint)" : "var(--a-fg)" }}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/**
 * 제작 단계 이동 — 단계 버튼을 누르면 (저장하지 않은 변경이 있으면 먼저 저장하고) /api/admin/editorial/stage로 옮긴다.
 * "발행"은 완성 조건(제목·소개·대표 이미지 / 큐레이션은 지역·공간까지)을 통과해야 하고 즉시 공개된다.
 * 단계는 건너뛸 수 있다. 보관된 콘텐츠는 먼저 복원해야 한다.
 */
export function StageControl({ kind, id, stage, archived, dirty, onSave }: {
  kind: PipelineKind;
  id?: string;
  stage: EditorialStageValue | null;
  archived: boolean;
  dirty: boolean;
  onSave: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<EditorialStageValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(target: EditorialStageValue) {
    if (!id || target === stage) return;
    setBusy(target);
    setError(null);
    try {
      if (dirty && !(await onSave())) return;
      const res = await fetch("/api/admin/editorial/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, stage: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(res.status === 401 ? "로그인이 만료되었어요. 다시 로그인해주세요." : data.error ?? "단계를 바꾸지 못했어요.");
      else router.refresh();
    } catch {
      setError("네트워크 오류로 단계를 바꾸지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  if (!id) {
    return <p className="text-xs" style={{ color: "var(--a-dim)" }}>저장하면 제작 단계를 관리할 수 있어요. 새 콘텐츠는 “제작” 단계로 시작합니다.</p>;
  }
  if (archived) {
    return <p className="text-xs" style={{ color: "var(--a-dim)" }}>보관된 콘텐츠예요. 아래 위험 영역에서 초안으로 복원하면 단계를 다시 옮길 수 있어요.</p>;
  }

  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap gap-1.5" aria-label="제작 단계">
        {EDITORIAL_STAGES.map((s, i) => {
          const on = s === stage;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => move(s)}
                disabled={!!busy}
                aria-pressed={on}
                title={STAGE_LABEL[s].description}
                className={on ? "a-btn a-btn-primary a-btn-sm" : "a-btn a-btn-sm"}
              >
                <span className="tabular-nums opacity-60 mr-1">{i + 1}</span>
                {busy === s ? "..." : STAGE_LABEL[s].ko}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--a-dim)" }}>
        {stage ? `${STAGE_LABEL[stage].ko} — ${STAGE_LABEL[stage].description}. ` : ""}
        단계는 건너뛸 수 있어요. “발행”을 누르면 바로 공개되고 LATEST·홈에 자동으로 나타나요. 발행 중에 다른 단계를 누르면 공개에서 내려가요.
      </p>
      {error && <p className="text-xs" style={{ color: "var(--a-danger)" }}>{error}</p>}
    </div>
  );
}
