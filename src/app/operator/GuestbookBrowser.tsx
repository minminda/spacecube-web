"use client";

import { useState } from "react";
import { formatDotDate as formatDots } from "@/lib/time";

interface Note {
  id: string;
  content: string;
  nickname: string | null;
  clusterType: string;
  createdAt: string;
  reactionCount: number;
}

const CLUSTER_LABELS: Record<string, string> = {
  FREE: "자유",
  QUESTION_1: "질문 1",
  QUESTION_2: "질문 2",
};

// 운영자용 방명록 열람 — 읽기 전용. 방문자의 이메일/전화번호 등은 애초에 전달되지 않는다(props에 없음).
export default function GuestbookBrowser({ notes }: { notes: Note[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openNote = notes.find((n) => n.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => setOpenId(note.id)}
            className="text-left p-3 space-y-2 transition-transform hover:-translate-y-0.5"
            style={{ background: "#F6E7A8", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <span className="inline-block text-[10px] px-1.5 py-0.5" style={{ background: "#3d3524", color: "#F6E7A8" }}>
              {CLUSTER_LABELS[note.clusterType] ?? note.clusterType}
            </span>
            <p className="text-[13px] leading-relaxed break-keep line-clamp-3" style={{ color: "#3d3524" }}>
              {note.content}
            </p>
            <p className="text-[10px]" style={{ color: "#8a7d5c" }}>
              — {note.nickname ?? "익명"} · {formatDots(note.createdAt)} · 공감 {note.reactionCount}
            </p>
          </button>
        ))}
      </div>

      {openNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}
        >
          <div className="w-full max-w-xs p-6" style={{ background: "#F6E7A8", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
            <span className="inline-block text-[10px] px-1.5 py-0.5 mb-3" style={{ background: "#3d3524", color: "#F6E7A8" }}>
              {CLUSTER_LABELS[openNote.clusterType] ?? openNote.clusterType}
            </span>
            <p className="text-base leading-relaxed break-keep" style={{ color: "#3d3524" }}>{openNote.content}</p>
            <p className="text-sm mt-3" style={{ color: "#8a7d5c" }}>
              — {openNote.nickname ?? "익명"} · {formatDots(openNote.createdAt)} · 공감 {openNote.reactionCount}
            </p>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="w-full text-xs py-2 border mt-5 pt-4"
              style={{ borderColor: "#3d3524", color: "#3d3524", borderTopWidth: 1 }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
