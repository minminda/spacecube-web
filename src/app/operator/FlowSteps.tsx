interface Props {
  steps: string[];
  lastEmphasis?: boolean;
}

/** about 페이지의 "경험의 흐름" 패턴을 재사용하는 번호 흐름 컴포넌트 */
export default function FlowSteps({ steps, lastEmphasis = false }: Props) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <span
              className="w-5 h-5 flex-shrink-0 border flex items-center justify-center text-xs"
              style={{ borderColor: "var(--border)", color: "var(--dim)" }}
            >
              {i + 1}
            </span>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 my-1" style={{ background: "var(--border)", minHeight: "1.5rem" }} />
            )}
          </div>
          <p
            className={`text-sm pt-0.5 pb-4 ${lastEmphasis && i === steps.length - 1 ? "font-semibold" : ""}`}
            style={{ color: lastEmphasis && i === steps.length - 1 ? "var(--fg)" : "var(--dim)" }}
          >
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}
