"use client";

/* EXPERIMENTAL ONLY — 손글씨→디지털 필체 변환 PoC 관리자 테스트 위저드.
   실제 방명록/Record/추천/QR/로그인 로직과 완전히 분리된 화면이며, 여기서 생성한 결과는
   화면 미리보기 용도로만 쓰이고 어디에도 영구 저장되지 않는다. */

import { useRef, useState } from "react";
import Link from "next/link";
import SampleSheet from "./SampleSheet";
import SentenceRenderer, { type CharResult } from "./SentenceRenderer";
import PostitPreview from "./PostitPreview";
import ManualCornerPicker from "./ManualCornerPicker";
import { compressImage } from "@/lib/imageCompress";

// 48칸 글자 디테일이 살아있어야 셀 분리 품질이 나오므로, 방명록 사진(1280)보다 넉넉하게 잡는다.
const UPLOAD_MAX_DIM = 1800;

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
  const [preview, setPreview] = useState<string | null>(null);
  const [cells, setCells] = useState<PreprocessCell[] | null>(null);
  const [manualCorners, setManualCorners] = useState<{ image: string; width: number; height: number } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const [encoding, setEncoding] = useState(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

  const [sentence, setSentence] = useState(PRESET_SENTENCES[0]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genResults, setGenResults] = useState<Record<string, CharResult> | null>(null);

  const [showPostit, setShowPostit] = useState(false);

  async function postPreprocess(file: File, corners?: [number, number][]) {
    const formData = new FormData();
    formData.append("file", file);
    if (corners) formData.append("corners", JSON.stringify(corners));
    const res = await fetch("/api/admin/handwriting/preprocess", { method: "POST", body: formData });
    const data = await res.json();
    return { res, data };
  }

  async function submitPreprocess(file: File, corners?: [number, number][]) {
    setUploading(true);
    setUploadError(null);
    setSessionExpired(false);
    setCells(null);
    try {
      let { res, data } = await postPreprocess(file, corners);
      // 세션 조회가 서버리스 DB 연결 문제로 간헐적으로 실패하는 것으로 보여, 401만
      // 한 번 조용히 재시도한다(진짜 로그인 만료라면 재시도해도 다시 401이 뜬다).
      if (!res.ok && res.status === 401 && data.code === "SESSION_EXPIRED") {
        await new Promise((r) => setTimeout(r, 1500));
        ({ res, data } = await postPreprocess(file, corners));
      }
      if (!res.ok) {
        if (res.status === 401 && data.code === "SESSION_EXPIRED") {
          setSessionExpired(true);
          return;
        }
        setUploadError(data.error ?? "이미지를 처리하지 못했습니다.");
        return;
      }
      if (data.needsManualCorners) {
        // 자동 종이 경계 감지 실패 — 수동으로 네 모서리를 지정하는 화면으로 전환.
        pendingFileRef.current = file;
        setManualCorners({ image: data.image, width: data.imageWidth, height: data.imageHeight });
        return;
      }
      setCells(data.cells);
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCoverage(null);
    setGenResults(null);
    setPreview(null);
    setManualCorners(null);

    let uploadFile: File;
    try {
      uploadFile = await compressImage(file, UPLOAD_MAX_DIM);
    } catch {
      setUploadError(
        "이 사진 형식을 읽을 수 없습니다. HEIC 사진이라면 JPG 또는 PNG로 다시 촬영/저장해서 올려주세요.",
      );
      return;
    }
    setPreview(URL.createObjectURL(uploadFile));
    await submitPreprocess(uploadFile);
  }

  async function handleManualCornersConfirm(corners: [number, number][]) {
    const file = pendingFileRef.current;
    setManualCorners(null);
    if (!file) return;
    await submitPreprocess(file, corners);
  }

  function handleManualCornersCancel() {
    setManualCorners(null);
    pendingFileRef.current = null;
    setUploading(false);
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

        <div className="p-3 border space-y-1" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--fg)" }}>촬영할 때</p>
          <ul className="text-xs space-y-0.5" style={{ color: "var(--dim)" }}>
            <li>· 종이 전체가 화면 안에 들어오게 해주세요</li>
            <li>· 네 모서리 검은 표시가 모두 보여야 합니다</li>
            <li>· 종이를 가능한 평평하게 놓아주세요</li>
            <li>· 그림자가 글자를 가리지 않게 해주세요</li>
            <li>· 검은색 펜 사용을 권장합니다</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <label
            className="inline-flex items-center justify-center text-sm px-4 py-2.5 border cursor-pointer hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
            style={{ borderColor: "var(--fg)" }}
          >
            {uploading ? "처리 중..." : "손글씨 촬영하기"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <label
            className="inline-flex items-center justify-center text-sm px-4 py-2.5 border cursor-pointer transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--dim)" }}
          >
            사진에서 선택
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {preview && (
          <div className="max-w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="촬영한 원본 미리보기" className="w-full border" style={{ borderColor: "var(--border)" }} />
          </div>
        )}

        {uploading && (
          <p className="text-xs" style={{ color: "var(--dim)" }}>손글씨 영역을 찾고 있습니다...</p>
        )}
        {uploadError && <p className="text-xs" style={{ color: "#c0392b" }}>{uploadError}</p>}
        {sessionExpired && (
          <div className="p-3 border space-y-2" style={{ borderColor: "#c0392b" }}>
            <p className="text-xs" style={{ color: "#c0392b" }}>
              로그인이 만료됐거나 관리자 권한이 확인되지 않았습니다. 다시 로그인한 뒤 이 화면으로 돌아와서 같은 사진으로 다시 시도해주세요.
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent("/admin/handwriting-test")}`}
              className="inline-block text-xs px-3 py-2 border font-medium"
              style={{ borderColor: "#c0392b", color: "#c0392b" }}
            >
              다시 로그인하기 →
            </Link>
          </div>
        )}
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
            {encoding && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>손글씨 특징을 읽고 있습니다... (몇 초 정도 걸려요)</p>
            )}
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
            {genLoading && (
              <p className="text-xs" style={{ color: "var(--dim)" }}>새로운 글씨를 만들고 있습니다...</p>
            )}
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

      {manualCorners && (
        <ManualCornerPicker
          imageDataUrl={manualCorners.image}
          imageWidth={manualCorners.width}
          imageHeight={manualCorners.height}
          onConfirm={handleManualCornersConfirm}
          onCancel={handleManualCornersCancel}
        />
      )}
    </div>
  );
}
