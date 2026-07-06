const VALUES = [
  { title: "공간의 철학 전달", desc: "설명하지 않아도, 이야기를 통해 공간의 결이 전해집니다." },
  { title: "방문자가 남긴 반응 확인", desc: "방문자가 이 공간을 어떻게 느꼈는지 조용히 쌓입니다." },
  { title: "공간과 맞는 사람과 연결", desc: "많은 손님이 아니라, 결이 맞는 손님과 이어집니다." },
  { title: "관리가 거의 필요 없음", desc: "설치 이후 운영자님이 따로 할 일은 거의 없습니다." },
];

export default function ValueSection() {
  return (
    <section className="px-6 py-14 space-y-6">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--border)" }}>운영자에게 어떤 가치가 있는가</p>

      <div className="space-y-5">
        {VALUES.map((v) => (
          <div key={v.title} className="flex gap-3">
            <span className="text-sm flex-shrink-0" style={{ color: "var(--fg)" }}>✓</span>
            <div className="space-y-1">
              <p className="text-sm font-medium">{v.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--dim)" }}>{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
