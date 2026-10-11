"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons";

/**
 * 휴대폰 공간 상세의 닫기 — 보던 화면(HOME · 검색 · 지역)으로 돌아간다.
 * 앱 안에서 들어온 경우만 뒤로 가고, 주소창 · 새 탭 · 외부 링크로 바로 들어왔으면 HOME으로 보낸다.
 */
export default function DetailCloseButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  function close() {
    let internal = false;
    try {
      internal = window.history.length > 1 && !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {/* referrer 파싱 실패 → HOME */}
    if (internal) router.back();
    else router.push("/");
  }
  return (
    <button type="button" onClick={close} aria-label="공간 상세 닫기" className={`w-11 h-11 inline-flex items-center justify-center rounded-[var(--ed-radius)] hover:bg-[var(--ed-soft)] active:bg-[var(--ed-soft)] ${className}`}>
      <CloseIcon className="w-5 h-5" />
    </button>
  );
}
