"use client";

import { useRef } from "react";
import Link from "next/link";
import LockIcon from "@/components/LockIcon";

interface Props {
  slug: string;
  episodes: { id: string; episodeNumber: number; title: string; state: string }[];
  /** QR(또는 관리자 · 운영자)로 이 공간의 이야기가 열려 있는가 */
  unlocked: boolean;
}

/**
 * 함께한 공간의 Episode 목록. 제목(EP.1)은 미리 보이지만, QR로 열리기 전에는 누르면 이야기로 들어가지 않고
 * 작은 안내 창만 뜬다. 열림 여부는 서버가 기존 resolveSpaceAccess로 판정해 내려준 값을 그대로 쓴다.
 * (URL 직접 접근도 /space/[slug]/episodes/[id]에서 같은 판정으로 막혀 있다.)
 */
export default function PartnerEpisodeList({ slug, episodes, unlocked }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <ul>
        {episodes.map((ep) => {
          const open = unlocked && ep.state !== "LOCKED";
          const row = (
            <span className="flex items-center gap-3 py-3.5 text-sm w-full text-left" style={{ borderBottom: "1px solid var(--ed-line)" }}>
              <span className="text-xs shrink-0" style={{ color: "var(--ed-dim)" }}>EP.{ep.episodeNumber}</span>
              <span className="flex-1 min-w-0 font-semibold break-keep" style={{ color: open ? undefined : "var(--ed-dim)" }}>{ep.title}</span>
              {open ? <span aria-hidden>→</span> : <LockIcon className="w-4 h-4 shrink-0" />}
            </span>
          );
          return (
            <li key={ep.id}>
              {open ? (
                <Link href={`/space/${slug}/episodes/${ep.id}`} className="block hover:underline underline-offset-4">{row}</Link>
              ) : (
                <button type="button" onClick={() => dialogRef.current?.showModal()} className="block w-full" aria-haspopup="dialog">{row}</button>
              )}
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby="episode-lock-title"
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
        className="m-auto w-[calc(100%-32px)] max-w-sm p-0 backdrop:bg-black/40"
        style={{ background: "var(--ed-bg)", color: "var(--ed-fg)", border: "1px solid var(--ed-fg)" }}
      >
        <div className="p-6 space-y-5">
          <LockIcon className="w-6 h-6" />
          <div className="space-y-2">
            <p id="episode-lock-title" className="text-base font-semibold break-keep">이 이야기는 공간에서 열 수 있어요.</p>
            <p className="text-sm leading-relaxed break-keep" style={{ color: "var(--ed-dim)" }}>공간을 방문해 공간큐브의 QR을 인식해보세요.</p>
          </div>
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className="ed-btn ed-btn-primary ed-btn-sm w-full">확인</button>
        </div>
      </dialog>
    </>
  );
}
