/* ── 잠금 상태 아이콘 — 🔒 이모지 대신 쓰는 미니멀한 선형 벡터 아이콘.
   currentColor를 써서 부모 텍스트 색(var(--dim) 등)을 그대로 물려받는다. ── */

interface Props {
  className?: string;
}

export default function LockIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
