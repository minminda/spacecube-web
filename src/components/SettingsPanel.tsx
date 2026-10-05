"use client";
import { useState } from "react";
import SettingsIcon from "@/components/SettingsIcon";
import SettingsForm, { type SettingsFormProps } from "@/components/SettingsForm";

/**
 * 예전 정보구조(ENABLE_EDITORIAL_HOME 꺼짐)의 설정 진입 — 톱니바퀴 + 아래에서 올라오는 패널.
 * 새 정보구조에서는 톱니바퀴를 쓰지 않고 메뉴의 "설정"(/settings)으로 들어간다. 내용은 같은 SettingsForm.
 */
export default function SettingsPanel(props: Omit<SettingsFormProps, "onSaved" | "autoFocus">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-11 h-11 -m-2.5 flex-shrink-0"
        style={{ color: "var(--dim)" }}
        aria-label="설정"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-sm p-6 space-y-6 overflow-y-auto" style={{ maxHeight: "88dvh", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--dim)" }}>설정</p>
              <button onClick={() => setOpen(false)} className="text-lg leading-none" style={{ color: "var(--dim)" }}>×</button>
            </div>
            <SettingsForm {...props} autoFocus onSaved={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
