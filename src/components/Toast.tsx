"use client";

interface Props {
  message: string | null;
}

/** useToast()와 짝을 이루는 프레젠테이션 — 관리자 화면 공용 하단 토스트. */
export default function Toast({ message }: Props) {
  if (!message) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-sm border"
      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}
    >
      {message}
    </div>
  );
}
