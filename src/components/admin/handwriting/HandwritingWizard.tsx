"use client";

/* EXPERIMENTAL ONLY — 손글씨→디지털 필체 변환 PoC 관리자 테스트 위저드.
   실제 방명록/Record/추천/QR/로그인 로직과 완전히 분리된 화면이며, 여기서 생성한 결과는
   화면 미리보기 용도로만 쓰이고 어디에도 영구 저장되지 않는다. */

import { useState } from "react";
import SampleSheet from "./SampleSheet";
import SentenceRenderer, { type CharResult } from "./SentenceRenderer";
import PostitPreview from "./PostitPreview";

interface PreprocessCell {
  char: string;
  image: string | null;
  empty: boolean;
  blurry: boolean;
}

interface Coverage {
  cho: { covered: number; total: number };
  jung: { covered: number; total: number };
  jong: { covered: number; total: number };
}

const PRESET_SENTENCES = [
  "오늘 이 공간에서 오래 머물렀어요",
  "다음에 다시 오고 싶은 곳이에요",
  "책을 읽다가 시간이 멈춘 것 같았어요",
  "좋은 하루였습니다",
  "생각보다 조용해서 좋았어요",
];

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>
      STEP {n} · {title}
    </p>
  );
}

export default function HandwritingWizard() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cells, setCells] = useState<PreprocessCell[] | null>(null);

  const [encoding, setEncoding] = useState(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  const [sentence, setSentence] = useState(PRESET_SENTENCES[0]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genResults, setGenResults] = useState<Record<string, CharResult> | null>(null);

  const [showPostit, setShowPostit] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadError(null);
    setCells(null);
    setCoverage(null);
    setGenResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/handwriting/preprocess", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "이미지를 처리하지 못했습니다.");
        return;
      }
      setCells(data.cells);
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  }

  async function handleEncode() {
    if (!cells) return;
    const usable = cells.filter((c) => !c.empty && c.image);
    if (usable.length === 0) {
      setEncodeError("사용할 수 있는 글자가 없습니다. 다시 업로드해주세요.");
      return;
    }
    setEncoding(true);
    setEncodeError(null);
    try {
      const res = await fetch("/api/admin/handwriting/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells: usable.map((c) => ({ char: c.char, image: c.image })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEncodeError(data.error ?? "필체를 생성하지 못했습니다. 다시 시도해주세요.");
        return;
      }
      setCoverage(data.coverage);
    } catch {
      setEncodeError("로컬 추론 서비스에 연결할 수 없습니다.");
    } finally {
      setEncoding(false);
    }
  }

  async function handleGenerateSentence(text: string) {
    if (!coverage) return;
    setSentence(text);
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await fetch("/api/admin/handwriting/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "문장을 생성하지 못했습니다.");
        return;
      }
      setGenResults(data.chars);
    } catch {
      setGenError("로컬 추론 서비스에 연결할 수 없습니다.");
    } finally {
      setGenLoading(false);
    }
  }

  const emptyCount = cells?.filter((c) => c.empty).length ?? 0;
  const blurryCount = cells?.filter((c) => c.blurry).length ?? 0;

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      {/* STEP 1 */}
      <section className="space-y-3">
        <StepLabel n={1} title="손글씨 작성용 양식 확인" />
        <SampleSheet />
      </section>

      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* STEP 2 */}
      <section className="space-y-3">
        <StepLabel n={2} title="작성한 종이 촬영 또는 업로드" />
        <label
          className="inline-flex items-center justify-center text-sm px-4 py-2.5 border cursor-pointer hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          style={{ borderColor: "var(--fg)" }}
        >
          {uploading ? "처리 중..." : "사진 촬영 / 업로드"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          JPG, PNG 지원. HEIC는 이번 PoC에서 지원하지 않습니다 — 촬영 시 카메라 설정을 JPEG로 바꿔주세요.
        </p>
        {uploadError && <p className="text-xs" style={{ color: "#c0392b" }}>{uploadError}</p>}
      </section>

      {/* STEP 3 */}
      {cells && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <StepLabel n={3} title="이미지 보정 및 글자 분리 결과 확인" />
            {(emptyCount > 0 || blurryCount > 0) && (
              <p className="text-xs" style={{ color: "#c0392b" }}>
                {emptyCount > 0 && `${emptyCount}칸이 비어 있습니다. `}
                {blurryCount > 0 && `${blurryCount}칸의 글씨가 흐릿할 수 있습니다. 검은 펜으로 다시 작성해주세요.`}
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {cells.map((c) => (
                <div key={c.char} className="border p-1.5 text-center space-y-1" style={{ borderColor: c.empty ? "#c0392b" : "var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>{c.char}</p>
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.char} className="w-full aspect-square object-contain bg-white" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center text-[10px]" style={{ background: "var(--border)", color: "var(--dim)" }}>
                      비어있음
                    </div>
                  )}
                  {c.blurry && <p className="text-[10px]" style={{ color: "#c0392b" }}>흐림</p>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* STEP 4 */}
      {cells && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <StepLabel n={4} title="필체 생성" />
            <button
              type="button"
              onClick={handleEncode}
              disabled={encoding}
              className="text-sm px-4 py-2.5 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--fg)" }}
            >
              {encoding ? "생성 중..." : coverage ? "다시 생성" : "필체 생성"}
            </button>
            {encodeError && <p className="text-xs" style={{ color: "#c0392b" }}>{encodeError}</p>}
            {coverage && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>
                초성 {coverage.cho.covered}/{coverage.cho.total} · 중성 {coverage.jung.covered}/{coverage.jung.total} · 종성 {coverage.jong.covered}/{coverage.jong.total} 커버됨
              </p>
            )}
          </section>
        </>
      )}

      {/* STEP 5 */}
      {coverage && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <StepLabel n={5} title="테스트 문장 입력" />
            <div className="flex flex-wrap gap-2">
              {PRESET_SENTENCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleGenerateSentence(s)}
                  className="text-xs px-3 py-1.5 border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="한글 문장을 입력하세요"
                className="flex-1 text-sm bg-transparent border px-3 py-2 outline-none"
                style={{ borderColor: "var(--border)", color: "var(--fg)" }}
              />
              <button
                type="button"
                onClick={() => handleGenerateSentence(sentence)}
                disabled={genLoading || !sentence.trim()}
                className="text-sm px-4 py-2 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                {genLoading ? "생성 중..." : "필체로 보기"}
              </button>
            </div>
            {genError && <p className="text-xs" style={{ color: "#c0392b" }}>{genError}</p>}
          </section>
        </>
      )}

      {/* STEP 6 */}
      {genResults && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-4">
            <StepLabel n={6} title="기본 폰트 vs 생성된 필체 비교" />
            <div className="space-y-1.5">
              <p className="text-xs" style={{ color: "var(--dim)" }}>기본 폰트</p>
              <p className="text-lg break-keep">{sentence}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs" style={{ color: "var(--dim)" }}>생성된 필체</p>
              <div className="p-3 border" style={{ borderColor: "var(--border)" }}>
                <SentenceRenderer text={sentence} results={genResults} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* STEP 7 */}
      {genResults && (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <section className="space-y-3">
            <StepLabel n={7} title="공간큐브 포스트잇 스타일 미리보기" />
            <button
              type="button"
              onClick={() => setShowPostit(true)}
              className="text-sm px-4 py-2.5 border hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
              style={{ borderColor: "var(--fg)" }}
            >
              방명록에서 보기
            </button>
            <p className="text-xs" style={{ color: "var(--dim)" }}>
              실제 GuestbookNote에는 저장되지 않습니다 — 화면 미리보기 전용입니다.
            </p>
          </section>
        </>
      )}

      {showPostit && genResults && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPostit(false); }}
        >
          <PostitPreview text={sentence} results={genResults} nickname="관리자 테스트" />
        </div>
      )}
    </div>
  );
}
