export default function Loading() {
  return (
    <main className="flex flex-col min-h-screen px-6 py-8 gap-6">
      <div className="space-y-1" style={{ color: "var(--dim)" }}>
        <p className="text-xs">SPACECUBE / ARCHIVE</p>
        <p className="text-xs">─────────────────────────────</p>
      </div>
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        &gt; 취향을 분석하는 중_
      </p>
    </main>
  );
}
