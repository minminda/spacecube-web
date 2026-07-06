/** 큐브 오브젝트 placeholder — 정적 와이어프레임, 애니메이션 없음 */
export default function CubePlaceholder() {
  return (
    <div
      className="flex items-center justify-center py-10"
      style={{ background: "var(--tag-bg)" }}
    >
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
        <g stroke="currentColor" strokeWidth="1.2" opacity="0.85">
          <path d="M18 30 L48 18 L78 30 L48 42 Z" />
          <path d="M18 30 L18 66 L48 78 L48 42 Z" />
          <path d="M78 30 L78 66 L48 78 L48 42 Z" />
        </g>
      </svg>
    </div>
  );
}
