import CubePlaceholder from "./CubePlaceholder";
import FlowSteps from "./FlowSteps";

export default function HowItWorks() {
  return (
    <section className="px-6 py-14 space-y-8">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>공간큐브는 무엇인가</p>

      <CubePlaceholder />

      <FlowSteps steps={["QR", "공간 이야기", "방문자 기록", "취향 발견"]} lastEmphasis />

      <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
        복잡한 설명 없이, 공간 안에 놓인 작은 오브젝트 하나로 시작됩니다.
      </p>
    </section>
  );
}
