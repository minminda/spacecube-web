export default function ProblemSection() {
  return (
    <section className="px-6 py-14 space-y-6">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>왜 만들었는가</p>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dim)" }}>대부분의 공간 플랫폼은</p>
        <ul className="space-y-1.5">
          {[
            "리뷰 중심으로 움직입니다.",
            "평점으로 줄을 세웁니다.",
            "검색 결과 안에서만 발견됩니다.",
            "공간의 철학은 전달되지 않습니다.",
          ].map((item, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed pl-3"
              style={{ color: "var(--dim)", borderLeft: "1px solid var(--border)" }}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm leading-loose whitespace-pre-line">
        {"공간큐브는 그 공간의 이야기를 방문자에게 전달하는 도구입니다.\n그리고 방문자가 공간을 어떻게 경험했는지, 기록하고 남길 수 있게 합니다."}
      </p>
    </section>
  );
}
