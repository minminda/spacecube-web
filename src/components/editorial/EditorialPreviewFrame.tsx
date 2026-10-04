"use client";

import { useEffect, useState } from "react";
import StoryArticle from "./StoryArticle";
import CurationArticle from "./CurationArticle";
import { curationArticleFromDraft, storyArticleFromDraft, type DraftInput } from "@/lib/editorial/draftView";
import type { SpaceView } from "@/lib/editorial/types";

export const PREVIEW_MESSAGE = "editorial-preview";
export const PREVIEW_READY = "editorial-preview-ready";

export interface PreviewPayload {
  draft: DraftInput;
  /** 초안이 가리키는 발행 공간(연결 공간 · 본문 공간 카드) */
  views: Record<string, SpaceView>;
}

const NO_SAVE = { savedIds: new Set<string>(), loggedIn: false };

/**
 * iframe 안의 미리보기 — 부모(관리자 폼)가 보내는 초안을 공개 상세와 같은 렌더러로 그린다.
 * 같은 출처의 부모 창 메시지만 받는다. 미리보기 안의 링크·버튼(내비게이션 포함)은 눌러도 이동·저장하지 않는다
 * — 작성 중인 관리자 화면을 떠나거나 실제 저장 API를 부르지 않게.
 */
export default function EditorialPreviewFrame() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const data = e.data as { type?: string; payload?: PreviewPayload };
      if (data?.type === PREVIEW_MESSAGE && data.payload) setPayload(data.payload);
    };
    const block = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("a, button, [role=button]");
      if (el) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", block, true);
    document.addEventListener("submit", block, true);
    window.parent?.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", block, true);
      document.removeEventListener("submit", block, true);
    };
  }, []);

  if (!payload) {
    return <p className="ed-container py-20 text-sm" style={{ color: "var(--ed-dim)" }}>미리보기를 불러오는 중…</p>;
  }
  const { draft, views } = payload;
  return (
    <div className="editorial-bleed">
      {draft.kind === "curations" ? (
        <CurationArticle
          backHref="/curation"
          backLabel={draft.label.trim() ? `${draft.label.trim()} 큐레이션` : "CURATION"}
          {...curationArticleFromDraft(draft, views, { placeholders: true })}
          saveState={NO_SAVE}
        />
      ) : (
        <StoryArticle {...storyArticleFromDraft(draft, views, { placeholders: true })} saveState={NO_SAVE} />
      )}
    </div>
  );
}
