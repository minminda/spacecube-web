import FlowSteps from "./FlowSteps";

export default function ProcessSection() {
  return (
    <section className="px-6 py-14 space-y-6">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>함께하는 과정</p>

      <FlowSteps steps={["인터뷰", "스토리 제작", "큐브 제작", "설치", "완료"]} lastEmphasis />

      <p className="text-sm leading-loose" style={{ color: "var(--dim)" }}>
        운영자님이 하실 일은 짧은 인터뷰 하나뿐입니다.
      </p>
    </section>
  );
}
