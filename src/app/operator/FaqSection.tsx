const FAQS = [
  { q: "비용은 어떻게 되나요?", a: "미팅에서 공간에 맞는 방식으로 안내드립니다. 부담스러운 비용을 먼저 제시하지 않습니다." },
  { q: "얼마나 걸리나요?", a: "인터뷰부터 설치까지 보통 2~3주 정도 소요됩니다." },
  { q: "관리는 누가 하나요?", a: "설치 이후 운영은 저희가 맡습니다. 운영자님이 따로 신경 쓰실 부분은 거의 없습니다." },
  { q: "QR만 놓으면 끝인가요?", a: "QR은 시작점입니다. 그 안에 담기는 공간의 이야기를 함께 만들어드립니다." },
  { q: "우리 공간도 가능한가요?", a: "공간마다 결이 다르기 때문에, 먼저 짧은 이야기를 나눠보고 함께 정합니다." },
];

export default function FaqSection() {
  return (
    <section className="px-6 py-14 space-y-6">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>자주 묻는 질문</p>

      <div className="space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="space-y-1.5">
            <p className="text-sm font-medium">Q. {f.q}</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--dim)" }}>{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
