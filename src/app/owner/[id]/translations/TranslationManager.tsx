"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRANSLATABLE_LOCALES, localeLabel } from "@/lib/locales";

type Status = "NOT_CREATED" | "READY" | "OUTDATED" | "ERROR";

export interface SpaceTranslationView {
  locale: string;
  status: Status;
  tagline: string | null;
  description: string | null;
  ownerBio: string | null;
  errorMessage: string | null;
}

interface SceneTranslationInfo {
  status: Status;
  title: string | null;
  content: string | null;
  errorMessage: string | null;
}

interface EpisodeTranslationInfo {
  status: Status;
  title: string | null;
  subtitle: string | null;
  errorMessage: string | null;
}

export interface SceneView {
  id: string;
  title: string | null;
  translations: Record<string, SceneTranslationInfo>;
}

export interface EpisodeView {
  id: string;
  episodeNumber: number;
  title: string;
  translations: Record<string, EpisodeTranslationInfo>;
  scenes: SceneView[];
}

interface Props {
  spaceId: string;
  multilingualEnabled: boolean;
  supportedLocales: string[];
  spaceTranslations: SpaceTranslationView[];
  episodes: EpisodeView[];
}

interface GenResult {
  scope: "space" | "episode" | "scene";
  targetId: string;
  targetLabel: string;
  locale: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

const STATUS_LABEL: Record<Status, string> = {
  NOT_CREATED: "번역 필요",
  READY: "완료",
  OUTDATED: "업데이트 필요",
  ERROR: "실패",
};

function StatusBadge({ status }: { status: Status }) {
  const color =
    status === "READY" ? "var(--fg)" : status === "ERROR" ? "#ef4444" : status === "OUTDATED" ? "var(--fg)" : "var(--dim)";
  return (
    <span className="text-xs px-1.5 py-0.5 border" style={{ borderColor: status === "ERROR" ? "#ef4444" : "var(--border)", color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function TranslationManager({
  spaceId,
  multilingualEnabled,
  supportedLocales,
  spaceTranslations,
  episodes,
}: Props) {
  const router = useRouter();

  // ── 다국어 설정 ──
  const [enabled, setEnabled] = useState(multilingualEnabled);
  const [locales, setLocales] = useState<string[]>(supportedLocales);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── 번역 생성 ──
  const [genLocales, setGenLocales] = useState<string[]>(supportedLocales.slice(0, 1));
  const [forceRegen, setForceRegen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<Set<string>>(new Set());

  const spaceTransByLocale = new Map(spaceTranslations.map((t) => [t.locale, t]));

  function toggleLocaleSetting(code: string) {
    setLocales((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function toggleGenLocale(code: string) {
    setGenLocales((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function togglePreview(key: string) {
    setPreview((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    const res = await fetch(`/api/spaces/${spaceId}/multilingual`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ multilingualEnabled: enabled, supportedLocales: locales }),
    });
    setSavingSettings(false);
    if (res.ok) {
      setSettingsSaved(true);
      setGenLocales((prev) => prev.filter((c) => locales.includes(c)));
      router.refresh();
      setTimeout(() => setSettingsSaved(false), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.error ?? "설정 저장에 실패했어요." });
    }
  }

  async function callGenerate(body: Record<string, unknown>) {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, locales: genLocales, force: forceRegen }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "번역 생성에 실패했어요." });
        return;
      }
      const results = (data.results ?? []) as GenResult[];
      const failed = results.filter((r) => !r.ok);
      const created = results.filter((r) => r.ok && !r.skipped);
      const skipped = results.filter((r) => r.skipped);
      if (failed.length === 0) {
        setMessage({
          type: "success",
          text: `번역 완료: ${created.length}건 생성${skipped.length > 0 ? `, ${skipped.length}건은 이미 최신이라 건너뜀` : ""}`,
        });
      } else {
        setMessage({
          type: "error",
          text: `일부 실패: 성공 ${created.length + skipped.length}건, 실패 ${failed.length}건 (${failed.map((f) => `${localeLabel(f.locale)}: ${f.error}`).slice(0, 3).join(" / ")})`,
        });
      }
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function generateSpace() {
    if (genLocales.length === 0 || generating) return;
    await callGenerate({ scope: "space" });
  }

  async function generateEpisode(episodeId: string) {
    if (genLocales.length === 0 || generating) return;
    await callGenerate({ scope: "episodes", episodeIds: [episodeId] });
  }

  async function generateAllEpisodes() {
    if (genLocales.length === 0 || generating || episodes.length === 0) return;
    // 서버가 요청당 최대 5개 에피소드로 제한하므로, 5개씩 나눠서 순차 호출한다.
    const chunkSize = 5;
    setGenerating(true);
    setMessage(null);
    let totalOk = 0;
    let totalFail = 0;
    try {
      for (let i = 0; i < episodes.length; i += chunkSize) {
        const chunk = episodes.slice(i, i + chunkSize).map((e) => e.id);
        const res = await fetch(`/api/admin/spaces/${spaceId}/translations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "episodes", episodeIds: chunk, locales: genLocales, force: forceRegen }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          totalFail += chunk.length;
          continue;
        }
        const results = (data.results ?? []) as GenResult[];
        totalOk += results.filter((r) => r.ok).length;
        totalFail += results.filter((r) => !r.ok).length;
      }
      setMessage(
        totalFail === 0
          ? { type: "success", text: `전체 에피소드 번역 완료 (${totalOk}건)` }
          : { type: "error", text: `일부 실패 — 성공 ${totalOk}건, 실패 ${totalFail}건` },
      );
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 다국어 사용 설정 */}
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 다국어 공간 페이지</p>
        <div className="flex gap-3">
          <button
            onClick={() => setEnabled(false)}
            className="flex-1 py-2 text-sm border transition-colors"
            style={{
              borderColor: !enabled ? "var(--fg)" : "var(--border)",
              background: !enabled ? "var(--fg)" : "transparent",
              color: !enabled ? "var(--bg)" : "var(--dim)",
            }}
          >
            사용 안 함
          </button>
          <button
            onClick={() => setEnabled(true)}
            className="flex-1 py-2 text-sm border transition-colors"
            style={{
              borderColor: enabled ? "var(--fg)" : "var(--border)",
              background: enabled ? "var(--fg)" : "transparent",
              color: enabled ? "var(--bg)" : "var(--dim)",
            }}
          >
            사용
          </button>
        </div>

        {enabled && (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "var(--dim)" }}>지원 언어 (복수 선택)</p>
            <div className="flex flex-wrap gap-2">
              {TRANSLATABLE_LOCALES.map((l) => (
                <label
                  key={l.code}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 border cursor-pointer select-none"
                  style={{ borderColor: locales.includes(l.code) ? "var(--fg)" : "var(--border)", color: locales.includes(l.code) ? "var(--fg)" : "var(--dim)" }}
                >
                  <input type="checkbox" checked={locales.includes(l.code)} onChange={() => toggleLocaleSetting(l.code)} className="hidden" />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="w-full py-2.5 text-sm border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
          style={{ borderColor: "var(--fg)" }}
        >
          {savingSettings ? "저장 중..." : settingsSaved ? "저장됨 ✓" : "다국어 설정 저장"}
        </button>
      </section>

      {!enabled ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>
          다국어를 사용으로 바꾸고 지원 언어를 저장하면 번역 생성 도구가 열립니다.
        </p>
      ) : locales.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--dim)" }}>지원 언어를 하나 이상 선택하고 저장해주세요.</p>
      ) : (
        <>
          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* 번역 생성 대상 언어 선택 (아래 모든 생성 버튼에 공통 적용) */}
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 번역 생성 대상 언어</p>
            <div className="flex flex-wrap gap-2">
              {locales.map((code) => (
                <label
                  key={code}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 border cursor-pointer select-none"
                  style={{ borderColor: genLocales.includes(code) ? "var(--fg)" : "var(--border)", color: genLocales.includes(code) ? "var(--fg)" : "var(--dim)" }}
                >
                  <input type="checkbox" checked={genLocales.includes(code)} onChange={() => toggleGenLocale(code)} className="hidden" />
                  {localeLabel(code)}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--dim)" }}>
              <input type="checkbox" checked={forceRegen} onChange={(e) => setForceRegen(e.target.checked)} />
              이미 완료된 번역도 다시 생성 (다시 생성 모드)
            </label>
          </section>

          {message && (
            <p className="text-xs leading-relaxed p-3 border" style={{ borderColor: message.type === "error" ? "#ef4444" : "var(--border)", color: message.type === "error" ? "#ef4444" : "var(--fg)" }}>
              {message.text}
            </p>
          )}

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* 공간 소개 번역 */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 공간 소개 번역</p>
              <button
                onClick={generateSpace}
                disabled={generating || genLocales.length === 0}
                className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                {generating ? "생성 중..." : "[선택 언어 번역 생성]"}
              </button>
            </div>
            <div className="space-y-2">
              {locales.map((code) => {
                const t = spaceTransByLocale.get(code);
                const status = t?.status ?? "NOT_CREATED";
                const key = `space:${spaceId}:${code}`;
                return (
                  <div key={code} className="p-3 border space-y-2" style={{ borderColor: "var(--border)" }}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{localeLabel(code)}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        {t && (t.tagline || t.description || t.ownerBio) && (
                          <button onClick={() => togglePreview(key)} className="text-xs" style={{ color: "var(--border)" }}>
                            {preview.has(key) ? "닫기" : "[미리보기]"}
                          </button>
                        )}
                      </div>
                    </div>
                    {t?.errorMessage && status === "ERROR" && (
                      <p className="text-xs" style={{ color: "#ef4444" }}>{t.errorMessage}</p>
                    )}
                    {preview.has(key) && t && (
                      <div className="text-xs leading-relaxed space-y-1 pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}>
                        {t.tagline && <p>{t.tagline}</p>}
                        {t.description && <p>{t.description}</p>}
                        {t.ownerBio && <p className="whitespace-pre-line">{t.ownerBio}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div style={{ borderTop: "1px solid var(--border)" }} />

          {/* 에피소드별 번역 */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>// 에피소드별 번역</p>
              <button
                onClick={generateAllEpisodes}
                disabled={generating || genLocales.length === 0 || episodes.length === 0}
                className="text-xs px-3 py-1.5 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                style={{ borderColor: "var(--fg)" }}
              >
                {generating ? "생성 중..." : "[전체 에피소드 번역 생성]"}
              </button>
            </div>

            {episodes.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--dim)" }}>등록된 에피소드가 없어요.</p>
            ) : (
              <div className="space-y-3">
                {episodes.map((ep) => {
                  const key = `episode:${ep.id}`;
                  return (
                    <div key={ep.id} className="p-4 border space-y-3" style={{ borderColor: "var(--border)" }}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">Episode {String(ep.episodeNumber).padStart(2, "0")}</p>
                        <button
                          onClick={() => generateEpisode(ep.id)}
                          disabled={generating || genLocales.length === 0}
                          className="text-xs px-2.5 py-1 border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:opacity-40"
                          style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                        >
                          번역 생성
                        </button>
                      </div>
                      <div className="space-y-2">
                        {locales.map((code) => {
                          const t = ep.translations[code];
                          const status = t?.status ?? "NOT_CREATED";
                          const pkey = `${key}:${code}`;
                          return (
                            <div key={code} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: "var(--dim)" }}>{localeLabel(code)}</span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={status} />
                                  {t && (t.title || t.subtitle) && (
                                    <button onClick={() => togglePreview(pkey)} className="text-xs" style={{ color: "var(--border)" }}>
                                      {preview.has(pkey) ? "닫기" : "[미리보기]"}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {t?.errorMessage && status === "ERROR" && (
                                <p className="text-xs" style={{ color: "#ef4444" }}>{t.errorMessage}</p>
                              )}
                              {preview.has(pkey) && t && (
                                <div className="text-xs leading-relaxed space-y-1 pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}>
                                  {t.title && <p className="font-medium" style={{ color: "var(--fg)" }}>{t.title}</p>}
                                  {t.subtitle && <p>{t.subtitle}</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {ep.scenes.length > 0 && (
                        <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid var(--border)" }}>
                          <p className="text-xs" style={{ color: "var(--dim)" }}>Scene {ep.scenes.length}개</p>
                          {ep.scenes.map((scene, i) => (
                            <div key={scene.id} className="space-y-1">
                              <p className="text-xs" style={{ color: "var(--dim)" }}>#{i + 1} {scene.title ?? "(제목 없음)"}</p>
                              <div className="flex flex-wrap gap-2">
                                {locales.map((code) => {
                                  const st = scene.translations[code];
                                  const status = st?.status ?? "NOT_CREATED";
                                  const skey = `scene:${scene.id}:${code}`;
                                  return (
                                    <div key={code} className="flex items-center gap-1.5">
                                      <span className="text-xs" style={{ color: "var(--border)" }}>{localeLabel(code)}</span>
                                      <StatusBadge status={status} />
                                      {st && st.content && (
                                        <button onClick={() => togglePreview(skey)} className="text-xs" style={{ color: "var(--border)" }}>
                                          {preview.has(skey) ? "닫기" : "미리보기"}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {locales.map((code) => {
                                const st = scene.translations[code];
                                const skey = `scene:${scene.id}:${code}`;
                                if (!preview.has(skey) || !st?.content) return null;
                                return (
                                  <p key={code} className="text-xs leading-relaxed whitespace-pre-line pl-3" style={{ borderLeft: "2px solid var(--border)", color: "var(--dim)" }}>
                                    {st.content}
                                  </p>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
