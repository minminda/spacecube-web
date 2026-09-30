"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/** 관리자 공통 확인/입력 모달 — 배경 클릭·Esc로 닫힌다. */
export default function AdminModal({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-5"
      style={{ background: "rgba(17,17,17,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg p-6 space-y-4" style={{ background: "#fff", border: "1px solid var(--a-line, #e6e6e6)" }}>
        <p className="text-[15px] font-semibold leading-snug">{title}</p>
        {children && <div className="text-sm leading-relaxed" style={{ color: "var(--a-dim, #6b6b6b)" }}>{children}</div>}
        {footer && <div className="flex justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </div>
  );
}
