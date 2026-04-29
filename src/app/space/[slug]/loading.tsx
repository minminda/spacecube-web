export default function Loading() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">공간큐브 / SPACE</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        &gt; 공간을 불러오는 중_
      </p>
    </main>
  );
}
