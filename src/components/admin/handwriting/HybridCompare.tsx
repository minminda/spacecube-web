"use client";

/* EXPERIMENTAL ONLY — Hybrid handwriting 비교 테스트 (스펙 1·10·11·12번).
   같은 문장을 4가지 방식으로 동시에 비교한다:
     A. Original  — DM-Font, 사용자 필체 100%
     B. Hybrid 30 — 기본 손글씨 70% + 사용자 필체 30% (DM-Font 컴포넌트 latent 블렌딩)
     C. Hybrid 50 — 기본 손글씨 50% + 사용자 필체 50%
     D. Base      — 사용자 필체 반영 없음, 기본 손글씨 폰트만
   B/C는 이미지 겹침(alpha overlay)이 아니라 handwriting-service/model/generator.py의
   set_hybrid_ratio()가 DM-Font 메모리에 쓰는 컴포넌트 feature 자체를 섞은 결과다.
   평가 버튼과 슬라이더 결과는 로컬 state로만 유지되고 어디에도 저장되지 않는다. */
import { useEffect, useState } from "react";
import SentenceRenderer, { type CharResult } from "./SentenceRenderer";
import PostitPreview from "./PostitPreview";
import { baseHandwritingFont } from "@/lib/handwriting/baseFont";

type ModeKey = "original" | "hybrid30" | "hybrid50" | "base";

const MODE_LABELS: Record<ModeKey, string> = {
  original: "A. Original — DM-Font 100%",
  hybrid30: "B. Hybrid 30 — 기본 70% + 내 필체 30%",
  hybrid50: "C. Hybrid 50 — 기본 50% + 내 필체 50%",
  base: "D. Base — 기본 손글씨만",
};

const EVAL_LABELS = ["가장 나 같다", "가장 읽기 좋다", "가장 자연스럽다"] as const;
type EvalLabel = (typeof EVAL_LABELS)[number];

interface GenerateResponse {
  chars?: Record<string, CharResult>;
  error?: string;
}

async function fetchGenerate(text: string, userRatio: number): Promise<{ ok: boolean; data: GenerateResponse }> {
  const res = await fetch("/api/admin/handwriting/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Python 쪽 pydantic 필드명(user_ratio)과 정확히 일치해야 한다 — 다르면 조용히
    // 기본값(1.0=Original)으로 무시되어 버그처럼 보이지 않는 버그가 생긴다.
    body: JSON.stringify({ text, user_ratio: userRatio }),
  });
  const data = (await res.json()) as GenerateResponse;
  return { ok: res.ok, data };
}

interface Props {
  sentence: string;
  originalResults: Record<string, CharResult>;
  nickname: string;
}

export default function HybridCompare({ sentence, originalResults, nickname }: Props) {
  const [hybrid30, setHybrid30] = useState<Record<string, CharResult> | null>(null);
  const [hybrid50, setHybrid50] = useState<Record<string, CharResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customRatioPct, setCustomRatioPct] = useState(30);
  const [customResults, setCustomResults] = useState<Record<string, CharResult> | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  const [showPostit, setShowPostit] = useState(false);
  const [votes, setVotes] = useState<Record<ModeKey, Set<EvalLabel>>>({
    original: new Set(),
    hybrid30: new Set(),
    hybrid50: new Set(),
    base: new Set(),
  });

  useEffect(() => {
    let cancelled = false;
    setHybrid30(null);
    setHybrid50(null);
    setCustomResults(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        // 순차 호출 — Python 추론 서비스는 모델 인스턴스 하나를 프로세스 전역으로
        // 공유한다(generator.py). 서로 다른 ratio로 동시에 /generate를 호출하면
        // set_hybrid_ratio가 메모리를 다시 쓰는 도중 다른 요청이 읽어갈 수 있어(경쟁
        // 상태), 병렬(Promise.all)이 아니라 반드시 순차로 호출한다. 각 호출은
        // encode를 재실행하지 않는 재-blend라 빠르다(로컬 실측 0.1~0.3초/ratio).
        const r30 = await fetchGenerate(sentence, 0.3);
        if (cancelled) return;
        if (!r30.ok || !r30.data.chars) {
          setError(r30.data.error ?? "Hybrid 30 생성에 실패했습니다.");
          setLoading(false);
          return;
        }
        setHybrid30(r30.data.chars);

        const r50 = await fetchGenerate(sentence, 0.5);
        if (cancelled) return;
        if (!r50.ok || !r50.data.chars) {
          setError(r50.data.error ?? "Hybrid 50 생성에 실패했습니다.");
          setLoading(false);
          return;
        }
        setHybrid50(r50.data.chars);
      } catch {
        if (!cancelled) setError("로컬 추론 서비스에 연결할 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sentence]);

  async function handleCustomRatioCommit() {
    setCustomLoading(true);
    try {
      const { ok, data } = await fetchGenerate(sentence, customRatioPct / 100);
      if (ok && data.chars) setCustomResults(data.chars);
    } catch {
      // 슬라이더는 개발자 테스트 보조 도구 — 실패해도 프리셋 4개 비교는 그대로 쓸 수 있다.
    } finally {
      setCustomLoading(false);
    }
  }

  function toggleVote(mode: ModeKey, label: EvalLabel) {
    setVotes((prev) => {
      const next = new Set(prev[mode]);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return { ...prev, [mode]: next };
    });
  }

  const rows: { key: ModeKey; results?: Record<string, CharResult>; pending?: boolean }[] = [
    { key: "original", results: originalResults },
    { key: "hybrid30", results: hybrid30 ?? undefined, pending: !hybrid30 },
    { key: "hybrid50", results: hybrid50 ?? undefined, pending: !hybrid50 },
    { key: "base", results: undefined },
  ];

  return (
    <div className="space-y-6">
      {loading && (
        <p className="text-xs" style={{ color: "var(--dim)" }}>Hybrid 30 / Hybrid 50를 생성하고 있습니다...</p>
      )}
      {error && <p className="text-xs" style={{ color: "#c0392b" }}>{error}</p>}

      <div className="space-y-3">
        {rows.map(({ key, results, pending }) => (
          <div key={key} className="p-3 border space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--dim)" }}>{MODE_LABELS[key]}</p>
            {pending ? (
              <p className="text-xs" style={{ color: "var(--dim)" }}>생성 중...</p>
            ) : (
              <p className="text-lg break-keep py-1">
                <SentenceRenderer
                  text={sentence}
                  results={results}
                  ink="#2a2a2a"
                  baseFontClassName={baseHandwritingFont.className}
                />
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {EVAL_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleVote(key, label)}
                  className="text-[11px] px-2 py-1 border transition-colors"
                  style={{
                    borderColor: votes[key].has(label) ? "var(--fg)" : "var(--border)",
                    background: votes[key].has(label) ? "var(--fg)" : "transparent",
                    color: votes[key].has(label) ? "var(--bg)" : "var(--dim)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium" style={{ color: "var(--fg)" }}>
          사용자 필체 반영 비율 (개발자 테스트용 슬라이더)
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={customRatioPct}
            onChange={(e) => setCustomRatioPct(Number(e.target.value))}
            onMouseUp={handleCustomRatioCommit}
            onTouchEnd={handleCustomRatioCommit}
            className="flex-1"
          />
          <span className="text-xs w-10 text-right tabular-nums" style={{ color: "var(--dim)" }}>
            {customRatioPct}%
          </span>
        </div>
        {customLoading && <p className="text-xs" style={{ color: "var(--dim)" }}>다시 생성 중...</p>}
        {customResults && (
          <p className="text-lg break-keep py-1">
            <SentenceRenderer
              text={sentence}
              results={customResults}
              ink="#2a2a2a"
              baseFontClassName={baseHandwritingFont.className}
            />
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowPostit(true)}
        className="text-sm px-4 py-2.5 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
        style={{ borderColor: "var(--fg)" }}
      >
        포스트잇으로 4개 비교
      </button>

      {showPostit && (
        <div
          className="fixed inset-0 z-50 overflow-auto flex flex-col items-center gap-6 p-6"
          style={{ background: "rgba(0,0,0,0.86)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPostit(false);
          }}
        >
          <button
            type="button"
            onClick={() => setShowPostit(false)}
            className="self-end text-xs px-3 py-1.5 border text-white shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.4)" }}
          >
            닫기 ✕
          </button>
          {rows.map(({ key, results, pending }) =>
            pending ? null : (
              <PostitPreview
                key={key}
                text={sentence}
                results={results}
                nickname={nickname}
                label={MODE_LABELS[key]}
                baseFontClassName={baseHandwritingFont.className}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
