"use client";

import { useState } from "react";

/* 내 아카이브(/taste/[userId])를 공유하는 버튼 — 원래 SettingsPanel 안에 있었지만
   설정값이 아니라 "공유"라는 행동이라 아카이브 화면으로 옮겨왔다. */
export default function ShareArchiveButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/taste/${userId}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button type="button" onClick={copyLink} className="text-xs" style={{ color: "var(--dim)" }}>
      {copied ? "링크 복사됨 ✓" : "공유 링크 복사"}
    </button>
  );
}
